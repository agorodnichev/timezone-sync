import { TermSearcher } from "../searcher.service";

class TrieNode<T> {
    public readonly children = new Map<string, TrieNode<T>>();
    public char: string;
    public isWord: boolean;
    public additionalData: T[] = [];

    constructor(char: string = '', data?: T) {
        this.char = char;
        if (data) {
            this.additionalData.push(data);
        }
    }
}

export class Trie<T> implements TermSearcher<T> { 
    private readonly root: TrieNode<T>;
    
    constructor() {
        this.root = new TrieNode();
    }

    public insert(word: string, data?: T): void {
        let node = this.root;
        for (const c of word) {
            if (!node.children.has(c)) {
                node.children.set(c, new TrieNode(c));
            }
            node = node.children.get(c);
        }
        node.isWord = true;
        node.additionalData.push(data);
    }

    public search(term: string): T[] {
        let currentNode = this.root;
        
        for (const chr of term) {
            if (!currentNode.children.has(chr)) {
                return;
            }
            currentNode = currentNode.children.get(chr);
        }
        
        if (currentNode.isWord) {
            return currentNode.additionalData;
        }

        return;
    }

    public autoComplete(term: string, numberOfWordsToReturn: number = Number.POSITIVE_INFINITY): T[] {

        if (numberOfWordsToReturn <= 0) {
            throw new Error('numberOfWordsToReturn cannot be less or equal than zero')
        }

        let node = this.root;
        const result: T[] = [];

        // iterate until the end of the term
        for (let i = 0; i < term.length; i++) {
            const chr = term[i];
            if (!node.children.has(chr)) {
                return;
            }

            node = node.children.get(chr);

            if (i === term.length - 1 && node.isWord) {
                result.push(...node.additionalData);
            }
        }

        if (result.length >= numberOfWordsToReturn) {
            return result;
        }

        // now search through the children of node BFS and every word
        // push in the result
        const queue = [...node.children.values()]; // TODO: LinkedList?
        
        while(queue.length && result.length < numberOfWordsToReturn) {
            let levelLength = queue.length;
            for (let i = 0; i < levelLength; i++) {
                node = queue[i];
                if (node.isWord) {
                    result.push(...node.additionalData);
                }

                if (node.children.size > 0) {
                    queue.push(...node.children.values());
                }
            }
            // before jumping onto another level, clear nodes from current level
            queue.splice(0, levelLength);
        }

        return result;
    }
}