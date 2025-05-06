import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CallInterfaceProps {
  isGuest: boolean;
  guestId: string;
  roomNumber: string;
  guestName: string;
  onClose: () => void;
}

type CallState = "idle" | "calling" | "receiving" | "ongoing";

const CallInterface = ({
  isGuest,
  guestId,
  roomNumber,
  guestName,
  onClose
}: CallInterfaceProps) => {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false); // Set default to false for audio-only calls
  const [callDuration, setCallDuration] = useState(0);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Setting up WebRTC when component mounts
  useEffect(() => {
    const setupPeerConnection = () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Send the ICE candidate to the other peer via Supabase Realtime
          channelRef.current?.send({
            type: "ice-candidate",
            candidate: event.candidate,
            guestId,
            isGuest
          });
        }
      };

      pc.ontrack = (event) => {
        // When remote stream is received, set it to the remote video element
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      setPeerConnection(pc);
      return pc;
    };

    // Setup Supabase realtime channel for signaling
    const channel = supabase.channel(`call-channel-${guestId}`);
    
    channel
      .on("broadcast", { event: "call-signal" }, async (payload) => {
        const { type, sdp, candidate, guestId: senderGuestId, isGuest: senderIsGuest, action } = payload.payload;
        
        // Make sure the message is not from ourselves
        if ((isGuest && senderIsGuest) || (!isGuest && !senderIsGuest)) {
          return;
        }

        // Handle different signal types
        if (type === "offer") {
          const pc = peerConnection || setupPeerConnection();
          setCallState("receiving");
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
            
            toast({
              title: `${isGuest ? "Recepción" : guestName} está llamando`,
              description: "Responda o rechace la llamada",
            });
          } catch (error) {
            console.error("Error setting remote description:", error);
          }
        } 
        else if (type === "answer" && peerConnection) {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
            setCallState("ongoing");
            
            // Start timer for call duration
            startCallTimer();
          } catch (error) {
            console.error("Error setting remote description:", error);
          }
        } 
        else if (type === "ice-candidate" && peerConnection) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("Error adding ice candidate:", error);
          }
        }
        else if (action === "call-accepted") {
          setCallState("ongoing");
          startCallTimer();
        }
        else if (action === "call-ended") {
          endCall();
        }
        else if (action === "call-rejected") {
          toast({
            title: "Llamada rechazada",
            description: `${isGuest ? "Recepción" : guestName} no está disponible en este momento`,
            variant: "destructive"
          });
          endCall();
        }
      })
      .subscribe();

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnection) {
        peerConnection.close();
      }
      
      if (callTimerRef.current) {
        window.clearInterval(callTimerRef.current);
      }
      
      supabase.removeChannel(channel);
    };
  }, [guestId, guestName, isGuest, toast]);

  // Set up local video stream when video element is available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  // Set up remote video stream when video element is available
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  const startCall = async () => {
    try {
      // Get user media - audio-only by default
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideoEnabled, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      // Create the peer connection if it doesn't exist
      const pc = peerConnection || new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      
      // Add local tracks to the connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Create and send the offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer via Supabase Realtime
      channelRef.current?.send({
        type: "broadcast",
        event: "call-signal",
        payload: {
          type: "offer",
          sdp: pc.localDescription?.sdp,
          guestId,
          isGuest
        }
      });
      
      setCallState("calling");
      setPeerConnection(pc);
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Error al iniciar la llamada",
        description: "No se pudo acceder al micrófono",
        variant: "destructive"
      });
    }
  };

  const acceptCall = async () => {
    try {
      // Get user media - audio-only by default
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideoEnabled, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      if (peerConnection) {
        // Add local tracks to the connection
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
        
        // Create and send the answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        // Send answer via Supabase Realtime
        channelRef.current?.send({
          type: "broadcast",
          event: "call-signal",
          payload: {
            type: "answer",
            sdp: peerConnection.localDescription?.sdp,
            guestId,
            isGuest,
            action: "call-accepted"
          }
        });
        
        setCallState("ongoing");
        startCallTimer();
      }
    } catch (error) {
      console.error("Error accepting call:", error);
      toast({
        title: "Error al aceptar la llamada",
        description: "No se pudo acceder al micrófono",
        variant: "destructive"
      });
    }
  };

  const rejectCall = () => {
    // Notify the other user that the call was rejected
    channelRef.current?.send({
      type: "broadcast",
      event: "call-signal",
      payload: {
        guestId,
        isGuest,
        action: "call-rejected"
      }
    });
    
    endCall();
  };

  const endCall = () => {
    // Notify the other user that the call ended
    if (callState !== "idle") {
      channelRef.current?.send({
        type: "broadcast",
        event: "call-signal",
        payload: {
          guestId,
          isGuest,
          action: "call-ended"
        }
      });
    }
    
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clear timer
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    // Reset state
    setCallState("idle");
    setCallDuration(0);
    
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        setIsVideoEnabled(!isVideoEnabled);
      } else if (!isVideoEnabled) {
        // If there are no video tracks and user wants to enable video
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(videoStream => {
            const videoTrack = videoStream.getVideoTracks()[0];
            if (peerConnection && videoTrack) {
              peerConnection.addTrack(videoTrack, localStream as MediaStream);
              setIsVideoEnabled(true);
            }
          })
          .catch(err => {
            console.error("Error adding video:", err);
            toast({
              title: "Error al habilitar video",
              description: "No se pudo acceder a la cámara",
              variant: "destructive"
            });
          });
      }
    }
  };

  const startCallTimer = () => {
    if (callTimerRef.current) return;
    
    callTimerRef.current = window.setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center"
      >
        <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${isMobile ? 'w-full h-full' : 'w-4/5 h-4/5 max-w-4xl'}`}>
          {/* Call status display */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                {callState === "idle" && "Iniciar llamada de voz"}
                {callState === "calling" && "Llamando..."}
                {callState === "receiving" && "Llamada entrante..."}
                {callState === "ongoing" && (
                  <div className="flex items-center">
                    <span className="mr-2">
                      {isGuest ? "Recepción" : `Cabaña ${roomNumber} - ${guestName}`}
                    </span>
                    <span className="bg-red-500 px-2 py-0.5 rounded-full text-xs">
                      {formatTime(callDuration)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Video container - only shown when video is enabled */}
          <div className="relative h-full">
            {/* Remote video (full screen) - only shown when in call with video */}
            {(callState === "ongoing" && isVideoEnabled) && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Local video (picture-in-picture) - only shown with video */}
            {(callState !== "idle" && isVideoEnabled) && (
              <div className="absolute bottom-20 right-4 w-1/4 h-1/4 max-w-[200px] max-h-[150px] rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Audio-only or initial state UI */}
            {!isVideoEnabled || callState !== "ongoing" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80">
                <div className={`rounded-full ${
                  callState === "calling" || callState === "receiving" 
                    ? "animate-ping bg-green-500 h-24 w-24 opacity-75 mb-8" 
                    : "bg-purple-500 h-20 w-20 mb-6"
                }`}>
                  <div className="flex items-center justify-center h-full">
                    {callState === "idle" && <Phone className="h-10 w-10 text-white" />}
                  </div>
                </div>
                <h3 className="text-xl font-medium text-white mb-2">
                  {callState === "idle" && "Iniciar una llamada de voz"}
                  {callState === "calling" && "Llamando..."}
                  {callState === "receiving" && "Llamada entrante"}
                  {callState === "ongoing" && !isVideoEnabled && "Llamada en curso"}
                </h3>
                <p className="text-gray-300 mb-8">
                  {callState === "idle" && `${isGuest ? "Recepción" : `Cabaña ${roomNumber} - ${guestName}`}`}
                  {callState === "calling" && "Espere mientras conectamos su llamada"}
                  {callState === "receiving" && `${isGuest ? "Recepción" : guestName} está llamando`}
                  {callState === "ongoing" && !isVideoEnabled && formatTime(callDuration)}
                </p>
              </div>
            ) : null}
          </div>
          
          {/* Call controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <div className="flex items-center justify-center space-x-4">
              {callState === "idle" && (
                <Button
                  onClick={startCall}
                  size="lg"
                  className="rounded-full bg-green-500 hover:bg-green-600 h-14 w-14 p-0"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              )}
              
              {callState === "calling" && (
                <Button
                  onClick={endCall}
                  size="lg"
                  className="rounded-full bg-red-500 hover:bg-red-600 h-14 w-14 p-0"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              )}
              
              {callState === "receiving" && (
                <>
                  <Button
                    onClick={acceptCall}
                    size="lg"
                    className="rounded-full bg-green-500 hover:bg-green-600 h-14 w-14 p-0"
                  >
                    <Phone className="h-6 w-6" />
                  </Button>
                  <Button
                    onClick={rejectCall}
                    size="lg"
                    className="rounded-full bg-red-500 hover:bg-red-600 h-14 w-14 p-0"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              )}
              
              {callState === "ongoing" && (
                <>
                  <Button
                    onClick={toggleMute}
                    size="lg"
                    className={`rounded-full ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"} h-12 w-12 p-0`}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  
                  <Button
                    onClick={toggleVideo}
                    size="lg"
                    className={`rounded-full ${!isVideoEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-purple-500 hover:bg-purple-600"} h-12 w-12 p-0`}
                  >
                    {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                  
                  <Button
                    onClick={endCall}
                    size="lg"
                    className="rounded-full bg-red-500 hover:bg-red-600 h-14 w-14 p-0"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallInterface;
