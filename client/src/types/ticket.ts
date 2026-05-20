export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  difficulty: number; // 1-5 rating
  createdAt: string;
  // Add other fields as needed
}
