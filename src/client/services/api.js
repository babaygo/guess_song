// Service API pour les appels externes
export class ApiService {
  async searchSongs(query, limit = 8) {
    if (!query || query.length < 2) {
      return [];
    }

    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(Math.max(limit, 1), 20))
    });

    try {
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Erreur recherche:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();