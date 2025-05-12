import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { showGlobalAlert } from "@/hooks/use-alerts";
import { Guest } from "@/types/dashboard";

export const useMessageActions = (
  selectedGuest: Guest | null,
  updateResponseStatus: (guestId: string) => Promise<void>
) => {
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };
  
  const sendTextReply = async () => {
    if (replyText.trim() === "" || !selectedGuest || isLoading) return false;
    setIsLoading(true);
    
    try {
      // Add the new message from reception staff
      const newMessage = {
        guest_id: selectedGuest.id,
        content: replyText,
        is_guest: false,
        is_audio: false
      };
      
      const { error } = await supabase.from('messages').insert([newMessage]);
      if (error) throw error;
      setReplyText("");

      // Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);
      
      return true;
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileUpload = async () => {
    if (!selectedFile || !selectedGuest) return false;
    setIsLoading(true);
    
    showGlobalAlert({
      title: "Subiendo archivo",
      description: "Por favor espere mientras se sube el archivo...",
      duration: 2000
    });
    
    try {
      // Determine file type
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';

      // Create folder structure: media/{guestId}/{fileType}s/
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const filePath = `media/${selectedGuest.id}/${fileType}s/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat_media')
        .upload(filePath, selectedFile);
        
      if (error) throw error;

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('chat_media')
        .getPublicUrl(filePath);

      // Create a new media message
      const newMessage = {
        guest_id: selectedGuest.id,
        content: fileType === 'image' ? "Imagen compartida" : "Video compartido",
        is_guest: false,
        is_audio: false,
        is_media: true,
        media_url: publicUrlData.publicUrl,
        media_type: fileType
      };
      
      const { error: msgError } = await supabase.from('messages').insert([newMessage]);
      if (msgError) throw msgError;

      // Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);

      toast({
        title: "Archivo enviado",
        description: "El archivo se ha enviado correctamente."
      });

      // Reset states
      setSelectedFile(null);
      return true;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error al subir archivo",
        description: "No se pudo enviar el archivo. Intente de nuevo.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAudioRecorded = async (audioBlob: Blob) => {
    if (!selectedGuest) return false;
    setIsLoading(true);
    
    try {
      // Upload to Supabase Storage
      const fileName = `audio_${Date.now()}_reception.webm`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('audio_messages')
        .upload(fileName, audioBlob);
        
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('audio_messages')
        .getPublicUrl(fileName);

      // Add message with audio
      const newAudioMessage = {
        guest_id: selectedGuest.id,
        content: "Mensaje de voz",
        is_guest: false,
        is_audio: true,
        audio_url: publicUrlData.publicUrl
      };
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert([newAudioMessage]);
        
      if (messageError) throw messageError;

      // Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);
      
      return true;
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje de voz",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMediaUploadComplete = async (mediaUrl: string, mediaType: 'image' | 'video') => {
    if (!selectedGuest) return false;
    
    try {
      // Create a new media message
      const newMessage = {
        guest_id: selectedGuest.id,
        content: mediaType === 'image' ? "Imagen compartida" : "Video compartido",
        is_guest: false,
        is_audio: false,
        is_media: true,
        media_url: mediaUrl,
        media_type: mediaType
      };
      
      const { error } = await supabase.from('messages').insert([newMessage]);
      if (error) throw error;

      // Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);
      
      return true;
    } catch (error) {
      console.error("Error sending media message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje multimedia",
        variant: "destructive"
      });
      return false;
    }
  };
  
  const handleSendMessage = async () => {
    if (!selectedGuest) return;
    
    if (selectedFile) {
      // If there's a file pending upload, upload it first
      await handleFileUpload();
    } else if (replyText.trim() !== "") {
      // Otherwise send a text message if there's text
      await sendTextReply();
    }
  };
  
  return {
    replyText,
    setReplyText,
    isLoading,
    selectedFile,
    handleFileSelect,
    handleSendMessage,
    handleAudioRecorded,
    handleMediaUploadComplete
  };
};
