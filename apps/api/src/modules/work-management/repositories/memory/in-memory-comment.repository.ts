import { randomUUID } from "node:crypto";

import type { Comment, CreateCommentInput } from "../../work-management.types.js";
import type { CommentRepository } from "../comment.repository.js";

export class InMemoryCommentRepository implements CommentRepository {
  private readonly comments = new Map<string, Comment>();

  async create(input: CreateCommentInput): Promise<Comment> {
    const timestamp = new Date().toISOString();
    const comment: Comment = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      workItemId: input.workItemId,
      authorUserId: input.authorUserId,
      content: input.content.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.comments.set(comment.id, comment);
    return comment;
  }

  async findById(
    workspaceId: string,
    commentId: string,
  ): Promise<Comment | null> {
    const comment = this.comments.get(commentId);
    if (!comment || comment.workspaceId !== workspaceId) {
      return null;
    }
    return comment;
  }

  async findByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<Comment[]> {
    const results: Comment[] = [];
    for (const comment of this.comments.values()) {
      if (
        comment.workspaceId === workspaceId &&
        comment.workItemId === workItemId
      ) {
        results.push(comment);
      }
    }
    return results.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }

  async update(
    workspaceId: string,
    commentId: string,
    content: string,
  ): Promise<Comment | null> {
    const comment = await this.findById(workspaceId, commentId);
    if (!comment) {
      return null;
    }

    const updated: Comment = {
      ...comment,
      content: content.trim(),
      updatedAt: new Date().toISOString(),
    };

    this.comments.set(commentId, updated);
    return updated;
  }

  async delete(workspaceId: string, commentId: string): Promise<boolean> {
    const comment = await this.findById(workspaceId, commentId);
    if (!comment) {
      return false;
    }
    return this.comments.delete(commentId);
  }
}
