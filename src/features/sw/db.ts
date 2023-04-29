import { STORENAME } from "../../constants";
import { City } from "../../models/db.model";


interface DBLifeCycle {
    onupgradeneededHook: (db: IDBDatabase, oldVersion: number, newVersion: number) => void;
}

let resolveOpenDB: (value: IDBDatabase) => void;
let rejectOpenDB: (reason?: any) => void;

export function openDBWith(
    dbName: string,
    dbVersion: number,
    hooks?: DBLifeCycle
    ): Promise<IDBDatabase> {

        const openDB = new Promise<IDBDatabase>((resolve, reject) => {
            resolveOpenDB = resolve;
            rejectOpenDB = reject;
        });
        
        const request: IDBOpenDBRequest = indexedDB.open(dbName, dbVersion);
        
        /**
         * Happens on DB creating or version changing with existing DB.
         * Should be used for creating stores. Actually this is the only place
         * where object stores can be created/altered/removed (DDL in other words).
         */
        request.onupgradeneeded = function (event: IDBVersionChangeEvent) {
            const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;
            if (hooks) {
                hooks.onupgradeneededHook.call(this, db, event.oldVersion, event.newVersion);
            }
        }
        
        /**
         * onblocked is called once DB is opened with version is greater than current one
         * but you still have tab(s) opened with an old version
         */
        request.onblocked = function (event: Event) {
            // This event shouldn't be called because we listen for onversionchange event
            // and close old database.
            console.log('Please close all other tabs with this app opened!');
        }
        
        request.onerror = function (event: Event) {
            const error = (event.target as IDBOpenDBRequest).error;
            rejectOpenDB(error);
            console.log('An error occured with indexedDB: ', error);
        };
        
        /**
         * Happens on DB opening
         */
        request.onsuccess = function (event: Event) {
            const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;
            resolveOpenDB(db);
            // Observe if new version is released
            registerVersionChangeHandler(db);
        }
    return openDB;
}

export async function isDbExist(dbName: string): Promise<boolean> {
    const dbs = await self.indexedDB.databases();
    return !!dbs.find(db => db.name === dbName)
}

export function uploadCitiesDataToDB(
    db: IDBDatabase,
    objectStore: IDBObjectStore,
    cities: City[]): void {

    objectStore.transaction.oncomplete = (event: Event) => {
        const transaction: IDBTransaction = db.transaction([STORENAME], 'readwrite');

        // Check if transaction completed successfully.
        transaction.oncomplete = (event: Event) => {
            console.log('Uploading cities into DB has been completed');
        }

        transaction.onerror = (event: Event) => {
            const error = (event.target as IDBTransaction).error;
            console.log('There was an error during transaction processing: ', error);
            transaction.abort();
        }

        const cityStore: IDBObjectStore = transaction.objectStore(STORENAME);

        for (const city of cities) {
            cityStore.add(city);
        }
    }
}

/**
 * ------------------------------------------------
 *              Helper functions
 * ------------------------------------------------
 */

/**
 * Registers 'onversionchange' event handler for future updates
 * from other browser tabs.
 */
function registerVersionChangeHandler(db: IDBDatabase): void {
    db.onversionchange = function (event: Event) {
        (event.target as IDBDatabase).close();
        alert("Database is outdated, please reload the page.");
    }
}

