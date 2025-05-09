
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { showGlobalAlert } from "@/hooks/use-alerts";

interface CallInterfaceProps {
  isGuest: boolean;
  guestId: string;
  roomNumber: string;
  guestName: string;
  onClose: () => void;
}

type CallState = "idle" | "calling" | "receiving" | "connecting" | "ongoing" | "failed";
type ConnectionStatus = "checking" | "connected" | "completed" | "disconnected" | "failed" | "closed" | null;

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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(null);
  const [iceGatheringStatus, setIceGatheringStatus] = useState<RTCIceGatheringState | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  const isCallActive = useRef<boolean>(false);
  const reconnectionAttempts = useRef<number>(0);
  const maxReconnectionAttempts = 3;
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Configure ICE servers with public STUN and TURN servers
  const getIceServers = () => {
    return {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    };
  };

  // Setting up WebRTC when component mounts
  useEffect(() => {
    const setupPeerConnection = () => {
      console.log("Setting up peer connection with ICE servers");
      const pc = new RTCPeerConnection(getIceServers());

      // Log connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Connection state changed: ${pc.connectionState}`);
        
        switch(pc.connectionState) {
          case 'connected':
            setConnectionStatus('connected');
            showGlobalAlert({
              title: "Conexión establecida",
              description: "La llamada está conectada correctamente",
              duration: 3000
            });
            break;
          case 'disconnected':
            setConnectionStatus('disconnected');
            showGlobalAlert({
              title: "Conexión interrumpida",
              description: "Intentando reconectar...",
              variant: "destructive",
              duration: 3000
            });
            break;
          case 'failed':
            setConnectionStatus('failed');
            showGlobalAlert({
              title: "Error de conexión",
              description: "No se pudo establecer la llamada. Intente nuevamente.",
              variant: "destructive",
              duration: 5000
            });
            if (callState === "ongoing" && reconnectionAttempts.current < maxReconnectionAttempts) {
              reconnectionAttempts.current++;
              showGlobalAlert({
                title: `Intento de reconexión (${reconnectionAttempts.current}/${maxReconnectionAttempts})`,
                description: "Intentando restablecer la llamada...",
                variant: "destructive",
                duration: 3000
              });
              // Attempt reconnection logic here
              setTimeout(() => {
                if (callState === "ongoing") {
                  restartCall();
                }
              }, 2000);
            } else if (reconnectionAttempts.current >= maxReconnectionAttempts) {
              setCallState("failed");
              showGlobalAlert({
                title: "Llamada fallida",
                description: "No se pudo restablecer la conexión después de varios intentos.",
                variant: "destructive",
                duration: 5000
              });
            }
            break;
          case 'closed':
            setConnectionStatus('closed');
            break;
        }
      };

      // Log ICE gathering state changes
      pc.onicegatheringstatechange = () => {
        console.log(`ICE gathering state: ${pc.iceGatheringState}`);
        setIceGatheringStatus(pc.iceGatheringState);
        
        if (pc.iceGatheringState === 'complete') {
          console.log("ICE gathering complete");
        }
      };

      // Log signaling state changes
      pc.onsignalingstatechange = () => {
        console.log(`Signaling state: ${pc.signalingState}`);
      };

      pc.onicecandidate = (event) => {
        console.log("ICE candidate generated:", event.candidate);
        if (event.candidate) {
          // Send the ICE candidate to the other peer via Supabase Realtime
          if (channelRef.current) {
            console.log("Sending ICE candidate");
            channelRef.current.send({
              type: "broadcast",
              event: "call-signal",
              payload: {
                type: "ice-candidate",
                candidate: event.candidate,
                guestId,
                isGuest
              }
            });
          } else {
            console.error("Channel not available to send ICE candidate");
          }
        }
      };

      pc.ontrack = (event) => {
        console.log("Remote track received", event.streams[0]);
        // When remote stream is received, set it to the remote video element
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        // Ensure call state is updated to ongoing once we receive tracks
        if (callState !== "ongoing") {
          setCallState("ongoing");
          startCallTimer();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state: ${pc.iceConnectionState}`);
        
        switch(pc.iceConnectionState) {
          case 'checking':
            setConnectionStatus('checking');
            break;
          case 'connected':
          case 'completed':
            setConnectionStatus('connected');
            if (callState !== "ongoing") {
              setCallState("ongoing");
              startCallTimer();
            }
            break;
          case 'disconnected':
            setConnectionStatus('disconnected');
            break;
          case 'failed':
            setConnectionStatus('failed');
            break;
          case 'closed':
            setConnectionStatus('closed');
            break;
        }
      };

      setPeerConnection(pc);
      return pc;
    };

    // Setup Supabase realtime channel for signaling
    console.log(`Setting up call channel for guest ID: ${guestId}`);
    const channel = supabase.channel(`call-channel-${guestId}`);
    
    channel
      .on("broadcast", { event: "call-signal" }, async (payload) => {
        console.log("Received signal:", payload.payload);
        const { type, sdp, candidate, guestId: senderGuestId, isGuest: senderIsGuest, action } = payload.payload;
        
        // Make sure the message is not from ourselves
        if ((isGuest && senderIsGuest) || (!isGuest && !senderIsGuest)) {
          console.log("Ignoring message from self");
          return;
        }

        // Handle different signal types
        if (type === "offer") {
          console.log("Received offer");
          const pc = peerConnection || setupPeerConnection();
          setCallState("receiving");
          
          try {
            console.log("Setting remote description (offer)");
            await pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
            
            toast({
              title: `${isGuest ? "Recepción" : guestName} está llamando`,
              description: "Responda o rechace la llamada",
            });

            showGlobalAlert({
              title: "Llamada entrante",
              description: `${isGuest ? "Recepción" : guestName} está llamando`,
              variant: "default",
              duration: 10000
            });
          } catch (error) {
            console.error("Error setting remote description:", error);
            toast({
              title: "Error en la llamada",
              description: "No se puede procesar la llamada entrante",
              variant: "destructive"
            });
          }
        } 
        else if (type === "answer" && peerConnection) {
          console.log("Received answer");
          try {
            console.log("Setting remote description (answer)");
            await peerConnection.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
            setCallState("ongoing");
            
            // Start timer for call duration
            startCallTimer();
          } catch (error) {
            console.error("Error setting remote description:", error);
            toast({
              title: "Error en la llamada",
              description: "No se pudo establecer la conexión",
              variant: "destructive"
            });
          }
        } 
        else if (type === "ice-candidate" && peerConnection) {
          console.log("Received ICE candidate");
          try {
            if (peerConnection.remoteDescription) {
              console.log("Adding ICE candidate");
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              console.warn("Received ICE candidate before remote description, buffering...");
              // In a production app, you'd buffer these candidates for later
            }
          } catch (error) {
            console.error("Error adding ice candidate:", error);
          }
        }
        else if (action === "call-accepted") {
          console.log("Call accepted");
          setCallState("connecting");
          showGlobalAlert({
            title: "Llamada aceptada",
            description: "Conectando...",
            duration: 3000
          });
        }
        else if (action === "call-ended") {
          console.log("Call ended by other party");
          endCall();
          showGlobalAlert({
            title: "Llamada finalizada",
            description: `${isGuest ? "Recepción" : guestName} ha finalizado la llamada`,
            duration: 3000
          });
        }
        else if (action === "call-rejected") {
          console.log("Call rejected");
          toast({
            title: "Llamada rechazada",
            description: `${isGuest ? "Recepción" : guestName} no está disponible en este momento`,
            variant: "destructive"
          });
          showGlobalAlert({
            title: "Llamada rechazada",
            description: `${isGuest ? "Recepción" : guestName} no está disponible en este momento`,
            variant: "destructive",
            duration: 3000
          });
          endCall();
        }
      })
      .subscribe((status) => {
        console.log(`Channel subscription status: ${status}`);
        if (status !== 'SUBSCRIBED') {
          console.error(`Failed to subscribe to channel: ${status}`);
        }
      });

    channelRef.current = channel;
    isCallActive.current = true;

    // Cleanup function
    return () => {
      console.log("Cleaning up call interface");
      isCallActive.current = false;
      
      if (localStream) {
        localStream.getTracks().forEach(track => {
          console.log("Stopping local track:", track.kind);
          track.stop();
        });
      }
      
      if (peerConnection) {
        console.log("Closing peer connection");
        peerConnection.close();
      }
      
      if (callTimerRef.current) {
        console.log("Clearing call timer");
        window.clearInterval(callTimerRef.current);
      }
      
      console.log("Removing channel");
      supabase.removeChannel(channel);
    };
  }, [guestId, guestName, isGuest, toast]);

  // Set up local video stream when video element is available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("Setting local video stream");
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  // Set up remote video stream when video element is available
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("Setting remote video stream");
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  const startCall = async () => {
    setCallState("calling");
    
    try {
      console.log("Requesting user media");
      // Get user media - audio-only by default
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideoEnabled, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      // Create the peer connection if it doesn't exist
      const pc = peerConnection || new RTCPeerConnection(getIceServers());
      
      console.log("Adding local tracks to peer connection");
      // Add local tracks to the connection
      stream.getTracks().forEach(track => {
        console.log("Adding track:", track.kind);
        pc.addTrack(track, stream);
      });
      
      console.log("Creating offer");
      // Create and send the offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      console.log("Setting local description");
      await pc.setLocalDescription(offer);
      
      console.log("Sending offer via Supabase Realtime");
      // Send offer via Supabase Realtime
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "call-signal",
          payload: {
            type: "offer",
            sdp: pc.localDescription?.sdp,
            guestId,
            isGuest
          }
        });
      } else {
        console.error("Channel not available to send offer");
        toast({
          title: "Error de conexión",
          description: "No se pudo iniciar la llamada, el canal no está disponible",
          variant: "destructive"
        });
        setCallState("failed");
        return;
      }
      
      setPeerConnection(pc);
      
      showGlobalAlert({
        title: "Llamando...",
        description: `Esperando a que ${isGuest ? "recepción" : guestName} responda`,
        duration: 5000
      });
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Error al iniciar la llamada",
        description: "No se pudo acceder al micrófono. Verifique los permisos del navegador.",
        variant: "destructive"
      });
      setCallState("failed");
    }
  };

  const acceptCall = async () => {
    setCallState("connecting");
    
    try {
      console.log("Accepting call - requesting media");
      // Get user media - audio-only by default
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideoEnabled, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      if (peerConnection) {
        console.log("Adding local tracks to peer connection");
        // Add local tracks to the connection
        stream.getTracks().forEach(track => {
          console.log("Adding track:", track.kind);
          peerConnection.addTrack(track, stream);
        });
        
        console.log("Creating answer");
        // Create and send the answer
        const answer = await peerConnection.createAnswer();
        console.log("Setting local description");
        await peerConnection.setLocalDescription(answer);
        
        console.log("Sending answer via Supabase Realtime");
        // Send answer via Supabase Realtime
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "call-signal",
            payload: {
              type: "answer",
              sdp: peerConnection.localDescription?.sdp,
              guestId,
              isGuest
            }
          });
          
          // Also send a call-accepted action for additional confirmation
          channelRef.current.send({
            type: "broadcast",
            event: "call-signal",
            payload: {
              guestId,
              isGuest,
              action: "call-accepted"
            }
          });
        } else {
          console.error("Channel not available to send answer");
          toast({
            title: "Error de conexión",
            description: "No se pudo aceptar la llamada, el canal no está disponible",
            variant: "destructive"
          });
          setCallState("failed");
          return;
        }
      } else {
        console.error("No peer connection available to accept call");
        toast({
          title: "Error de conexión",
          description: "No se pudo aceptar la llamada, no hay una conexión establecida",
          variant: "destructive"
        });
        setCallState("failed");
        return;
      }
      
      showGlobalAlert({
        title: "Llamada aceptada",
        description: "Conectando...",
        duration: 3000
      });
    } catch (error) {
      console.error("Error accepting call:", error);
      toast({
        title: "Error al aceptar la llamada",
        description: "No se pudo acceder al micrófono o cámara. Verifique los permisos del navegador.",
        variant: "destructive"
      });
      setCallState("failed");
    }
  };

  const rejectCall = () => {
    console.log("Rejecting call");
    // Notify the other user that the call was rejected
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: {
          guestId,
          isGuest,
          action: "call-rejected"
        }
      });
    } else {
      console.error("Channel not available to reject call");
    }
    
    endCall();
  };

  const restartCall = async () => {
    console.log("Attempting to restart call");
    
    // Stop existing tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    // Close existing peer connection
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
    // Create new peer connection
    const newPc = new RTCPeerConnection(getIceServers());
    setPeerConnection(newPc);
    
    try {
      // Get media again
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isVideoEnabled, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      // Add tracks to new connection
      stream.getTracks().forEach(track => {
        newPc.addTrack(track, stream);
      });
      
      // Setup event handlers
      newPc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "call-signal",
            payload: {
              type: "ice-candidate",
              candidate: event.candidate,
              guestId,
              isGuest
            }
          });
        }
      };
      
      newPc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      
      // Create new offer
      const offer = await newPc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await newPc.setLocalDescription(offer);
      
      // Send new offer
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "call-signal",
          payload: {
            type: "offer",
            sdp: newPc.localDescription?.sdp,
            guestId,
            isGuest
          }
        });
        
        showGlobalAlert({
          title: "Reconectando llamada",
          description: "Intentando restablecer la conexión...",
          duration: 3000
        });
      } else {
        throw new Error("Channel not available");
      }
      
    } catch (error) {
      console.error("Failed to restart call:", error);
      setCallState("failed");
      
      showGlobalAlert({
        title: "Error de reconexión",
        description: "No se pudo restablecer la llamada",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const endCall = () => {
    console.log("Ending call");
    // Notify the other user that the call ended
    if (callState !== "idle" && channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: {
          guestId,
          isGuest,
          action: "call-ended"
        }
      });
    } else {
      console.log("Not sending end call signal - call is idle or channel not available");
    }
    
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
    }
    
    // Clear timer
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    // Reset connection state
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
    // Reset state
    setCallState("idle");
    setCallDuration(0);
    reconnectionAttempts.current = 0;
    setConnectionStatus(null);
    setRemoteStream(null);
    setIceGatheringStatus(null);
    
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

  const toggleVideo = async () => {
    if (!localStream) return;
    
    const videoTracks = localStream.getVideoTracks();
    
    if (videoTracks.length > 0) {
      // Toggle existing video tracks
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    } else if (!isVideoEnabled) {
      // If there are no video tracks and user wants to enable video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        if (peerConnection && videoTrack) {
          // Add the new track to the peer connection
          const sender = peerConnection.addTrack(videoTrack, localStream);
          
          // Add the track to the local stream as well
          localStream.addTrack(videoTrack);
          
          setIsVideoEnabled(true);
          
          // Send signal to remote peer that video has been enabled
          if (channelRef.current && peerConnection.iceConnectionState === 'connected') {
            // In a production app, you'd negotiate this change with the remote peer
            console.log("Video enabled - would need to renegotiate in production app");
          }
        }
      } catch (err) {
        console.error("Error adding video:", err);
        toast({
          title: "Error al habilitar video",
          description: "No se pudo acceder a la cámara. Verifique los permisos del navegador.",
          variant: "destructive"
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

  const renderCallStatus = () => {
    switch (connectionStatus) {
      case 'checking':
        return (
          <span className="flex items-center text-amber-500">
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Conectando...
          </span>
        );
      case 'connected':
      case 'completed':
        return (
          <span className="flex items-center text-green-500">
            <CheckCircle className="h-4 w-4 mr-1" />
            Conectado
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center text-red-500">
            <AlertCircle className="h-4 w-4 mr-1" />
            Fallo de conexión
          </span>
        );
      case 'disconnected':
        return (
          <span className="flex items-center text-amber-500">
            <AlertCircle className="h-4 w-4 mr-1" />
            Desconectado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
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
                {callState === "connecting" && "Conectando..."}
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
                {callState === "failed" && "Llamada fallida"}
              </div>
              <div className="text-sm text-white/70">
                {renderCallStatus()}
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
                    : callState === "connecting"
                    ? "bg-amber-500 h-20 w-20 mb-6"
                    : callState === "failed"
                    ? "bg-red-500 h-20 w-20 mb-6" 
                    : "bg-purple-500 h-20 w-20 mb-6"
                }`}>
                  <div className="flex items-center justify-center h-full">
                    {callState === "idle" && <Phone className="h-10 w-10 text-white" />}
                    {callState === "connecting" && <Loader2 className="h-10 w-10 text-white animate-spin" />}
                    {callState === "failed" && <AlertCircle className="h-10 w-10 text-white" />}
                  </div>
                </div>
                <h3 className="text-xl font-medium text-white mb-2">
                  {callState === "idle" && "Iniciar una llamada de voz"}
                  {callState === "calling" && "Llamando..."}
                  {callState === "connecting" && "Conectando..."}
                  {callState === "receiving" && "Llamada entrante"}
                  {callState === "ongoing" && !isVideoEnabled && "Llamada en curso"}
                  {callState === "failed" && "Llamada fallida"}
                </h3>
                <p className="text-gray-300 mb-8">
                  {callState === "idle" && `${isGuest ? "Recepción" : `Cabaña ${roomNumber} - ${guestName}`}`}
                  {callState === "calling" && "Espere mientras conectamos su llamada"}
                  {callState === "connecting" && "Estableciendo conexión..."}
                  {callState === "receiving" && `${isGuest ? "Recepción" : guestName} está llamando`}
                  {callState === "ongoing" && !isVideoEnabled && formatTime(callDuration)}
                  {callState === "failed" && "No se pudo establecer la conexión. Intente de nuevo."}
                </p>
                
                {callState === "failed" && (
                  <Button
                    onClick={endCall}
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 mb-4"
                  >
                    Cerrar
                  </Button>
                )}
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
              
              {callState === "connecting" && (
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
