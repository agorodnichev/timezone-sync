import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { City } from '../../models/db.model';
import { openDBWith, isDbExist, uploadCitiesDataToDB } from './db';
import { DBNAME, STORENAME } from '../../constants';
import { buildTermSearcher, fillTermSearcherWithData, SearcherData } from './autocompleter';
import { SearchThrough } from './searcher.service';

declare const self: ServiceWorkerGlobalScope;


let citiesData: City[];
let termSearcher: SearchThrough<SearcherData>;

precacheAndRoute(self.__WB_MANIFEST);

/**
 * ----------------------------------------
 * Service worker listeners
 * ----------------------------------------
 */

self.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(installSW());
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
      self.clients.claim()
    );
  });


/**
 * Creates indexedDB, downloads cities data, creates Trie based on the cities names
 */
async function installSW(): Promise<IDBDatabase> {
    const isDbAlreadyCreated = await isDbExist(DBNAME);
    if (!isDbAlreadyCreated) {
        citiesData = await downloadCities();
    }
    const openedDB: IDBDatabase = await openAndOrUpgradeDB();
    citiesData = await getCitiesFromDb(openedDB);

    termSearcher = buildTermSearcher();
    fillTermSearcherWithData(citiesData, termSearcher);
    
    // DB is already filled as well as Trie (termSearcher) data structure
    // so there is no need to keep citiesData anymore and we can release
    // a memory
    citiesData = undefined;

    return openedDB;
}

/**
 * Downloads cities names/coordinates/timezones
 */
async function downloadCities(): Promise<City[]> {
    const response: Response = await self.fetch('cities.json');
    const cities = (await response.json());
    return cities;
}

async function upgradeDB(db: IDBDatabase, oldVersion: number, newVersion: number) {
    switch (oldVersion) {
        case 0:
            // client had no database
            const store: IDBObjectStore = createStore(db);
            uploadCitiesDataToDB(db, store, citiesData);
            break;
        default:
            // client needs update
            console.log('database update is processing');
    }
}

async function openAndOrUpgradeDB(): Promise<IDBDatabase> {
    return await openDBWith(DBNAME, 1, { onupgradeneededHook: upgradeDB });
}

function getCitiesFromDb(db: IDBDatabase): Promise<City[]> {

    let resolveCities: (value: City[]) => void;
    let rejectCities: (reason?: any) => void;

    const loader = new Promise<City[]>((resolve, reject) => {
        resolveCities = resolve;
        rejectCities = reject;
    });

    const transaction = db.transaction([STORENAME], 'readonly');

    const cityStore: IDBObjectStore = transaction.objectStore(STORENAME);
    const cityRequest = cityStore.getAll();
    // On Success - resolve
    cityRequest.onsuccess = (event) => {
        resolveCities((event.target as IDBRequest).result as City[]);
    };

    // On Error - reject
    cityRequest.onerror = (event) => {
        rejectCities((event.target as IDBRequest).error);
    };

    return loader;
}

function createStore(db: IDBDatabase): IDBObjectStore {
    // Cities Store
    const citiesStore = db.createObjectStore(STORENAME, { autoIncrement: true });
    citiesStore.createIndex('name', 'name', { unique: false });
    return citiesStore;
}


registerRoute(
    ({ url, request, event }) => {
        return url.pathname.includes('api/request');
    },
    async ({ url, request, event, params }) => {
        const term = url.searchParams.get('term');
        // Service Worker losts local state so that in-memory termSearcher
        // gets garbage collected. In that case we should rebuild TRIE ds
        if (!termSearcher) {
            const db = await openDBWith(DBNAME, 1);
            const cities = await getCitiesFromDb(db);
            termSearcher = buildTermSearcher();
            fillTermSearcherWithData(cities, termSearcher);  
        }
        const candidates = termSearcher.autoComplete(term, 10);

        return new Response(JSON.stringify(candidates || []), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
    }
)