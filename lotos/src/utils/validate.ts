import { z } from 'zod';
import { parseLotUri, parseFileUri, type LotFileUriParts, type LotUriParts } from './uri.js';

const LotUriParser = z
  .string()
  .min(1, 'Lot URI is required.')
  .transform((value, ctx): LotUriParts => {
    try {
      return parseLotUri(value);
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : 'Invalid lot URI.' });
      return z.NEVER;
    }
  });

const FileUriParser = z
  .string()
  .min(1, 'File URI is required.')
  .transform((value, ctx): LotFileUriParts => {
    try {
      return parseFileUri(value);
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : 'Invalid file URI.' });
      return z.NEVER;
    }
  });

export const CreateLotInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(256).optional(),
  kind: z.string().max(128).optional()
});

export const LotUriSchema = LotUriParser;
export const FileUriSchema = FileUriParser;

export const FsListInputSchema = z.object({
  lotUri: LotUriParser,
  path: z.string().default('.')
});

export const FsReadInputSchema = z.object({
  uri: FileUriParser,
  asBase64: z.boolean().optional()
});

export const FsWriteInputSchema = z.object({
  uri: FileUriParser,
  data: z.string(),
  mimeType: z.string().optional(),
  overwrite: z.boolean().default(false)
});

export const FsDeleteInputSchema = z.object({
  uri: FileUriParser,
  recursive: z.boolean().optional()
});

export const RuntimeExecInputSchema = z.object({
  lotUri: LotUriParser,
  language: z.literal('python'),
  code: z.string().min(1, 'Code is required.'),
  cwd: z.string().optional()
});

export type CreateLotInput = z.infer<typeof CreateLotInputSchema>;
export type LotUriInput = z.infer<typeof LotUriSchema>;
export type FileUriInput = z.infer<typeof FileUriSchema>;
export type FsListInput = z.infer<typeof FsListInputSchema>;
export type FsReadInput = z.infer<typeof FsReadInputSchema>;
export type FsWriteInput = z.infer<typeof FsWriteInputSchema>;
export type FsDeleteInput = z.infer<typeof FsDeleteInputSchema>;
export type RuntimeExecInput = z.infer<typeof RuntimeExecInputSchema>;
