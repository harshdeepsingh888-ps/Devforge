import type { Comment, CreateCommentInput } from "../work-management.types.js";

export interface CommentRepository {
  create(input: CreateCommentInput): Promise<Comment>;
  findById(workspaceId: string, commentId: string): Promise<Comment | null>;
  findByWorkItem(workspaceId: string, workItemId: string): Promise<Comment[]>;
  update(workspaceId: string, commentId: string, content: string): Promise<Comment | null>;
  delete(workspaceId: string, commentId: string): Promise<boolean>;
}
