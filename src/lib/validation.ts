import { z } from "zod";

// ============ Server Action Schemas ============

/**
 * Schema para updateMovieRating
 */
export const updateRatingSchema = z.object({
    watchlistId: z.string().uuid("ID de watchlist inválido"),
    rating: z
        .number()
        .int("La calificación debe ser un número entero")
        .min(1, "La calificación mínima es 1")
        .max(10, "La calificación máxima es 10"),
});

/**
 * Schema para deleteImport
 */
export const deleteImportSchema = z.object({
    importId: z.string().uuid("ID de importación inválido"),
});

/**
 * Schema para items individuales del CSV de importación
 */
export const importItemSchema = z.object({
    imdb_id: z.string().optional(),
    title: z.string().min(1, "El título es requerido"),
    year: z.number().int().min(1888).max(2100).optional(),
    user_rating: z.number().min(1).max(10).optional(),
    directors: z.string().optional(),
    genres: z.string().optional(),
    runtime_mins: z.number().optional(),
    imdb_rating: z.number().optional(),
    date_rated: z.string().optional(),
});

/**
 * Schema para el payload de processImport
 */
export const processImportSchema = z.object({
    movies: z.array(importItemSchema).min(1, "Debe haber al menos una película"),
    source: z.enum(["letterboxd", "imdb", "tmdb", "manual"]).default("manual"),
});

// ============ Types ============

export type UpdateRatingInput = z.infer<typeof updateRatingSchema>;
export type DeleteImportInput = z.infer<typeof deleteImportSchema>;
export type ImportItemInput = z.infer<typeof importItemSchema>;
export type ProcessImportInput = z.infer<typeof processImportSchema>;

// ============ Validation Helper ============

/**
 * Valida input y retorna resultado tipado o error
 */
export function validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data);

    if (!result.success) {
        const errorMessage = result.error.issues
            .map((e) => e.message)
            .join(", ");
        return { success: false, error: errorMessage };
    }

    return { success: true, data: result.data };
}
