import * as fs from 'fs';
import * as path from 'path';

export class YamlLoaderError extends Error {
  constructor(message: string, public filePath?: string) {
    super(message);
    this.name = 'YamlLoaderError';
  }
}

export abstract class YamlLoaderBase {
  protected dataPath: string;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  /**
   * Load a single YAML file
   */
  protected loadYamlFile<T>(filePath: string): T {
    try {
      if (!this.validateFileExists(filePath)) {
        throw new YamlLoaderError(`File does not exist: ${filePath}`, filePath);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return this.parseYaml<T>(content);
    } catch (error) {
      if (error instanceof YamlLoaderError) {
        throw error;
      }
      throw new YamlLoaderError(
        `Error loading YAML file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        filePath
      );
    }
  }

  /**
   * Load multiple YAML files matching a pattern
   */
  protected loadYamlFiles<T>(pattern: string, arrayKey: string): T[] {
    try {
      const dir = path.dirname(pattern);
      const filename = path.basename(pattern);
      const fullDir = path.join(this.dataPath, dir);
      
      if (!fs.existsSync(fullDir)) {
        console.warn(`Directory not found: ${fullDir}`);
        return [];
      }

      const files = fs.readdirSync(fullDir)
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
        .filter(file => filename === '*' || file === filename)
        .map(file => path.join(fullDir, file));
      
      if (files.length === 0) {
        console.warn(`No YAML files found in: ${fullDir}`);
        return [];
      }

      const results: T[] = [];
      
      for (const file of files) {
        try {
          const data = this.loadYamlFile<Record<string, any>>(file);
          if (data[arrayKey] && Array.isArray(data[arrayKey])) {
            results.push(...data[arrayKey]);
          }
        } catch (error) {
          console.error(`Error loading file ${file}:`, error);
          // Continue loading other files even if one fails
        }
      }
      
      return results;
    } catch (error) {
      throw new YamlLoaderError(
        `Error loading YAML files with pattern ${pattern}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a file exists
   */
  protected validateFileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Get the full path for a data file
   */
  protected getDataPath(relativePath: string): string {
    return path.join(this.dataPath, relativePath);
  }

  /**
   * Abstract method to parse YAML content - implementation depends on environment
   */
  protected abstract parseYaml<T>(content: string): T;

  /**
   * Validate that all required files exist
   */
  protected validateRequiredFiles(files: string[]): void {
    const missing = files.filter(file => !this.validateFileExists(this.getDataPath(file)));
    
    if (missing.length > 0) {
      throw new YamlLoaderError(`Missing required files: ${missing.join(', ')}`);
    }
  }
}