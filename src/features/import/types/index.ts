
export type ImportQueueStatus = 'pending' | 'processing' | 'completed' | 'error';

export type ImportQueueItem = {
  id: string;
  user_id: string;
  status: ImportQueueStatus;
  payload: any;
  created_at: string;
  updated_at: string;
};

// Plataforma de la que viene el archivo importado.
export type ImportSource = 'imdb' | 'tmdb' | 'letterboxd';

// Película tal como sale del CSV y se encola en `import_queue.payload`.
// IMDb trae `imdb_id`, TMDB trae `tmdb_id` (y a veces `imdb_id`), Letterboxd no
// trae ningún ID: el worker la identifica buscando en TMDB por título y año.
export type CsvMovieImport = {
  source?: ImportSource; // Ausente = IMDb (items encolados antes de soportar otros orígenes)
  imdb_id?: string; // Const
  tmdb_id?: number; // TMDb ID
  media_type?: 'movie' | 'tv'; // Type (solo TMDB)
  title: string;
  year?: number;
  user_rating?: number; // Tu Calificación, siempre en escala 1–10
  date_rated?: string; // Fecha de Calificación
  genres?: string;
  url?: string;
  imdb_rating?: number; // Calificación IMDb
  runtime_mins?: number; // Duración (mins)
  release_date?: string; // Fecha de Lanzamiento
  directors?: string; // Directores
  num_votes?: number; // Núm Votos
  position?: number; // Orden en lista
};
