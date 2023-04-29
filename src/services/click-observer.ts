export interface Subscriber {
    parent: HTMLElement;
    callback: (match: boolean) => void
}

export abstract class ClickObserver {

    private static isActive: boolean = false;
    private static readonly subscribers = new Set<Subscriber>();

    private static handler = (event: MouseEvent) => {
        for (const sub of ClickObserver.subscribers) {
            sub.callback.call(this, ClickObserver.isParentMatch(sub.parent,(event.target as HTMLElement)));
        }
    };

    private static isParentMatch(parent: HTMLElement, target: HTMLElement): boolean {
        let node = target;
        while (node && node !== parent) {
            node = node.parentElement;
        }
        return node === target;
    }

    private static register() {
        document.body.removeEventListener('click', ClickObserver.handler);
        document.body.addEventListener('click', ClickObserver.handler);
    }

    public static subscribe(subscriber: Subscriber) {
        
        if (!ClickObserver.isActive) {
            ClickObserver.register();
            ClickObserver.isActive = true;
        }

        ClickObserver.subscribers.add(subscriber);
        return {
            unsubscribe: () => {
                ClickObserver.subscribers.delete(subscriber);
                if (ClickObserver.subscribers.size === 0) {
                    document.body.removeEventListener('click', ClickObserver.handler);
                    ClickObserver.isActive = false;
                }
            }
        };
    }

}