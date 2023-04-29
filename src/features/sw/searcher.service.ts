export interface TermSearcher<T> {
    insert(term: string, data?: T): void;
    search(term: string): T[];
    autoComplete(term: string, numberOfWordsToReturn: number): T[];
}

/**
 * Provides interface to work with abstract db
 */
export class SearchThrough<T> implements TermSearcher<T> {
    private static instance: SearchThrough<unknown>;
    constructor(private readonly searcher: TermSearcher<T>) {
        if (SearchThrough.instance) {
            // Singleton
            return SearchThrough.instance as SearchThrough<T>;
        }
        SearchThrough.instance = this;
    }

    insert(term: string, data?: T): void {
        return this.searcher.insert(term, data);
    }

    search(term: string): T[] {
        return this.searcher.search(term);
    }

    autoComplete(term: string, numberOfWordsToReturn: number = 15): T[] {
        return this.searcher.autoComplete(term, numberOfWordsToReturn);
    }
}