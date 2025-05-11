
// Room type constants for validation
export const ROOM_TYPE = {
  COUPLE: "couple", 
  FAMILY: "family"
};

// Maximum number of guests allowed per room type
export const MAX_GUESTS_BY_ROOM_TYPE = {
  [ROOM_TYPE.COUPLE]: 3,
  [ROOM_TYPE.FAMILY]: 8,
  default: 4 // Default maximum if type is not specified
};

/**
 * Gets the maximum allowed guests for a specific room type
 */
export const getMaxGuestsForRoomType = (roomType: string | null): number => {
  if (!roomType) return MAX_GUESTS_BY_ROOM_TYPE.default;
  
  const type = roomType.toLowerCase();
  return MAX_GUESTS_BY_ROOM_TYPE[type as keyof typeof MAX_GUESTS_BY_ROOM_TYPE] || 
         MAX_GUESTS_BY_ROOM_TYPE.default;
};

/**
 * Helper function to translate room type to Spanish
 */
export const getRoomTypeText = (type: string | null): string => {
  if (!type) return "";
  switch (type.toLowerCase()) {
    case ROOM_TYPE.COUPLE:
      return "Pareja";
    case ROOM_TYPE.FAMILY:
      return "Familiar";
    default:
      return type;
  }
};
