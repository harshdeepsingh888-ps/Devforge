import type { PrismaClient } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../../infrastructure/database/prisma.js";
import type { Comment, CreateCommentInput } from "../../work-management.types.js";
import type { CommentRepository } from "../comment.repository.js";

type CommentDatabaseClient = Pick<PrismaClient, "comment">;

function toCommentDomain(raw: any): Comment {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    workItemId: raw.workItemId,
    authorUserId: raw.authorUserId,
    content: raw.content,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export class PrismaCommentRepository implements CommentRepository {
  constructor(
    private readonly database: CommentDatabaseClient = prisma,
  ) {}

  async create(input: CreateCommentInput): Promise<Comment> {
    const comment = await this.database.comment.create({
      data: {
        workspaceId: input.workspaceId,
        workItemId: input.workItemId,
        authorUserId: input.authorUserId,
        content: input.content.trim(),
      },
    });

    return toCommentDomain(comment);
  }

  async findById(
    workspaceId: string,
    commentId: string,
  ): Promise<Comment | null> {
    const comment = await this.database.comment.findFirst({
      where: { id: commentId, workspaceId },
    });
    return comment ? toCommentDomain(comment) : null;
  }

  async findByWorkItem(
    workspaceId: string,
    workItemId: string,
  ): Promise<Comment[]> {
    const comments = await this.database.comment.findMany({
      where: { workspaceId, workItemId },
      orderBy: { createdAt: "asc" },
    });
    return comments.map(toCommentDomain);
  }

  async update(
    workspaceId: string,
    commentId: string,
    content: string,
  ): Promise<Comment | null> {
    const existing = await this.findById(workspaceId, commentId);
    if (!existing) return null;

    const updated = await this.database.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
    });

    return toCommentDomain(updated);
  }

  async delete(workspaceId: string, commentId: string): Promise<boolean> {
    const existing = await this.findById(workspaceId, commentId);
    if (!existing) return false;

    await this.database.comment.delete({
      where: { id: commentId },
    });
    return true;
  }
}
