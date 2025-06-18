export class HttpError extends Error {
  constructor(message: string, public status?: number, public response?: Response) {
    super(message);
    this.name = 'HttpError';
  }
}

export class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = this.baseUrl + url;
    
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json() as any;
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If we can't parse error as JSON, use the basic message
      }
      
      throw new HttpError(errorMessage, response.status, response);
    }

    try {
      return await response.json() as T;
    } catch (error) {
      throw new HttpError('Invalid JSON response');
    }
  }

  async get<T>(url: string): Promise<T> {
    return this.fetchJson<T>(url, { method: 'GET' });
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return this.fetchJson<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return this.fetchJson<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.fetchJson<T>(url, { method: 'DELETE' });
  }
}