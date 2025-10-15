import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private _storage: Storage | null = null;
  private isHybrid: boolean = false;

  constructor(private storage: Storage, private platform: Platform) {
    this.init();
  }

  async init() {
    this.isHybrid = this.platform.is('hybrid');
    this._storage = await this.storage.create();
  }

  public async set(key: string, value: any): Promise<void> {
    await this._storage?.set(key, value);
  }

  public async get(key: string): Promise<any> {
    return this._storage?.get(key);
  }

  public async remove(key: string): Promise<void> {
    await this._storage?.remove(key);
  }

  public async clear(): Promise<void> {
    await this._storage?.clear();
  }

public async keys(): Promise<string[]> {
  return (await this._storage?.keys()) ?? [];
}


  public isHybridPlatform(): boolean {
    return this.isHybrid;
  }
}
