export function debounce(func: (...args: any[]) => any, delayInSec: number) {
    let savedArgs = [];
    let timeoutId: number;
    return function (...args: any[]) {

        savedArgs = [...args];

        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
            func.call(this, ...args);
        }, delayInSec * 1000);
    }
}