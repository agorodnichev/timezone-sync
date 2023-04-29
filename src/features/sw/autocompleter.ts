import { City } from "../../models/db.model";
import { Trie } from "./ds/trie.ds";
import { SearchThrough } from "./searcher.service";

export interface SearcherData {
    city: string;
    country: string;
    tz: string;
    descr: string;
}

export function buildTermSearcher(): SearchThrough<SearcherData> {
    return new SearchThrough<SearcherData>(new Trie());
}


export function fillTermSearcherWithData(data: City[], searcher: SearchThrough<SearcherData>): void {
    for (const location of data) {
        searcher.insert(location.city.toLowerCase(), {city: location.city, country: location.country, tz: location.tz, descr: location.descr});
    }
}