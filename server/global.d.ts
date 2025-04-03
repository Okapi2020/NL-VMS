import { Visitor } from "@shared/schema";

declare global {
  var broadcastCheckIn: (visitor: Visitor, purpose?: string) => void;
}

export {};