
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { showGlobalAlert } from "@/hooks/use-alerts";
import { Guest } from "@/types/dashboard";

export const useChatDeletion = (
  refreshGuestsList: () => Promise<void>,
  setMessages: React.Dispatch<React.SetStateAction<Record<string, any>>>
) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const { toast } = useToast();

  const deleteChat = async (selectedGuest: Guest | null) => {
    const guestToRemove = guestToDelete || selectedGuest;
    
    if (!guestToRemove) return false;
    
    setIsDeleting(true);
    
    try {
      showGlobalAlert({
        title: "Eliminando conversación",
        description: `Eliminando todos los mensajes con ${guestToRemove.name}...`,
        duration: 3000
      });
      
      // Get all messages for this guest to identify media files to delete
      const { data: messagesToDelete, error: msgFetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('guest_id', guestToRemove.id);
        
      if (msgFetchError) throw msgFetchError;
      
      // Collect media files to delete
      const mediaFilesToDelete: string[] = [];
      const audioFilesToDelete: string[] = [];
      
      for (const msg of messagesToDelete || []) {
        // Collect audio files
        if (msg.is_audio && msg.audio_url) {
          const audioPath = msg.audio_url.split('/').pop();
          if (audioPath) audioFilesToDelete.push(audioPath);
        }
        
        // Collect media files (images, videos)
        if (msg.is_media && msg.media_url) {
          // Extract path from the full URL
          const urlParts = msg.media_url.split('/chat_media/');
          if (urlParts.length > 1) {
            mediaFilesToDelete.push(urlParts[1]);
          }
        }
      }
      
      // Step 1: Delete all messages for this guest
      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .eq('guest_id', guestToRemove.id);
        
      if (deleteMessagesError) throw deleteMessagesError;
      
      // Step 2: Delete media files from storage if any exist
      if (mediaFilesToDelete.length > 0) {
        try {
          const { error: mediaDeleteError } = await supabase
            .storage
            .from('chat_media')
            .remove(mediaFilesToDelete);
            
          if (mediaDeleteError) {
            console.error("Error deleting media files:", mediaDeleteError);
            // Continue with deletion process even if some media files failed to delete
          }
        } catch (mediaError) {
          console.error("Error handling media file deletion:", mediaError);
          // Continue with process despite errors with media deletion
        }
      }
      
      // Step 3: Delete audio files from storage if any exist
      if (audioFilesToDelete.length > 0) {
        try {
          const { error: audioDeleteError } = await supabase
            .storage
            .from('audio_messages')
            .remove(audioFilesToDelete);
            
          if (audioDeleteError) {
            console.error("Error deleting audio files:", audioDeleteError);
            // Continue with deletion process even if some audio files failed to delete
          }
        } catch (audioError) {
          console.error("Error handling audio file deletion:", audioError);
          // Continue with process despite errors with audio deletion
        }
      }
      
      // Step 4: Delete the guest from the guests table
      const { error: guestDeleteError } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestToRemove.id);
        
      if (guestDeleteError) {
        console.error("Error deleting guest:", guestDeleteError);
        toast({
          title: "Advertencia",
          description: "Se eliminaron todos los mensajes pero hubo un problema al eliminar al huésped. Parte de la información podría permanecer en el sistema.",
          variant: "destructive",
          duration: 5000
        });
      }
      
      // Clear messages from local state
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[guestToRemove.id];
        return newMessages;
      });
      
      // Force refresh guests list
      refreshGuestsList();
      
      toast({
        title: "Conversación eliminada",
        description: "Todos los mensajes, archivos y datos del huésped han sido eliminados correctamente.",
        duration: 4000
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar completamente la conversación. Por favor, inténtalo de nuevo.",
        variant: "destructive",
        duration: 4000
      });
      return false;
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setGuestToDelete(null);
    }
  };
  
  return {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isDeleting,
    guestToDelete,
    setGuestToDelete,
    deleteChat
  };
};
