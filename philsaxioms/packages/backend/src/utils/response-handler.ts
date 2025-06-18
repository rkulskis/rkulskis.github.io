import { Request, Response, NextFunction } from 'express';

export type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;
export type RouteHandler = (req: Request, res: Response, next: NextFunction) => any;

export class ResponseHandler {
  /**
   * Handle successful response
   */
  static handleSuccess<T>(res: Response, data: T, status: number = 200): void {
    res.status(status).json(data);
  }

  /**
   * Handle error response
   */
  static handleError(res: Response, error: Error, message: string, status: number = 500): void {
    console.error(`${message}:`, error);
    res.status(status).json({ 
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  /**
   * Wrap async route handler with error handling
   */
  static wrapAsyncRoute(handler: AsyncRouteHandler): RouteHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        this.handleError(res, error as Error, 'Internal server error');
      }
    };
  }

  /**
   * Create a standardized data loading route
   */
  static createDataRoute<T>(
    dataLoader: () => Promise<T>,
    errorMessage: string = 'Failed to load data'
  ): RouteHandler {
    return this.wrapAsyncRoute(async (req, res) => {
      try {
        const data = await dataLoader();
        this.handleSuccess(res, data);
      } catch (error) {
        this.handleError(res, error as Error, errorMessage);
      }
    });
  }

  /**
   * Create a route that finds data by ID
   */
  static createFindByIdRoute<T>(
    finder: (id: string) => Promise<T | null>,
    errorMessage: string = 'Item not found',
    notFoundMessage: string = 'Item not found'
  ): RouteHandler {
    return this.wrapAsyncRoute(async (req, res) => {
      try {
        const { id } = req.params;
        const item = await finder(id);
        
        if (!item) {
          return res.status(404).json({ error: notFoundMessage });
        }
        
        this.handleSuccess(res, item);
      } catch (error) {
        this.handleError(res, error as Error, errorMessage);
      }
    });
  }
}