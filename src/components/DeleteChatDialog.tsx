
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface DeleteChatDialogProps {
  isOpen: boolean;
  guestName: string;
  roomNumber: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

const DeleteChatDialog = ({
  isOpen,
  guestName,
  roomNumber,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteChatDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este chat?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás por eliminar todas las conversaciones con{" "}
            <strong>{guestName}</strong> de la cabaña{" "}
            <strong>{roomNumber}</strong>.
            <br />
            <br />
            Esta acción eliminará:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Todos los mensajes de texto</li>
              <li>Todos los mensajes de audio</li>
              <li>Todas las imágenes y videos compartidos</li>
              <li>Estadísticas relacionadas con la conversación</li>
            </ul>
            <br />
            Esta acción <strong>no puede deshacerse</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Eliminando...
              </>
            ) : (
              "Sí, eliminar chat"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteChatDialog;
