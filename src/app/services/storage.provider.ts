// src/app/services/storage.provider.ts
import { Storage } from '@ionic/storage-angular';
import { makeEnvironmentProviders } from '@angular/core';

export function provideStorage() {
  return makeEnvironmentProviders([
    {
      provide: Storage,
      useFactory: async () => {
        const storage = new Storage();
        await storage.create();
        return storage;
      }
    }
  ]);
}
