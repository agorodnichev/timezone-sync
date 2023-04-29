export interface Awaiter {
    resolver: (value: unknown) => void;
    rejecter: (reason?: any) => void;
    promise: Promise<unknown>
}

export function getAwaiter(): Awaiter {
    let resolver;
    let rejecter;
    const promise = new Promise((resolve, reject) => {
        resolver = resolve;
        rejecter = reject;
    });

    return {
        resolver,
        rejecter,
        promise
    };
}