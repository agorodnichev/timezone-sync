import { debounce } from "../../services/debounce";
import { ClickObserver } from "../../services/click-observer";
import { Awaiter, getAwaiter } from "../../services/awaiter";

export interface ProviderData {
    key: string;
    textContent: string;
    datasets: object;
}

export class AutoCompleterComponent extends HTMLElement {

    private currentSelection?: any = {};
    private minimumLettersToStartSearch = 3;
    private clickOutsideSubscription?: {unsubscribe: () => void};

    private providerIsReady: Awaiter = getAwaiter();

    private readonly divWrapper: HTMLDivElement;
    private readonly searchInput: HTMLInputElement;
    private uL: HTMLUListElement;
    private provider: (term: string) => Promise<Array<ProviderData>>;
    private typeAheadHandler: (event: Event) => void;

    private currentlyActiveOption: HTMLLIElement | null = null;
    private _currentListNavigationIndex = -1;
    
    private get currentListNavigationIndex(): number {
        return this._currentListNavigationIndex;
    }

    private set currentListNavigationIndex(idx: number) {
        // saves new active option index
        this._currentListNavigationIndex = idx;
        if (idx === -1) {
            return;
        }
        // gets reference to the new active option
        const newActiveOption = this.getOptionByIndex(idx);
        if (!this.currentlyActiveOption) {
            this.currentlyActiveOption = newActiveOption;
            this.currentlyActiveOption.classList.add('active');
            return;
        }
        this.currentlyActiveOption.classList.remove('active');
        this.currentlyActiveOption = newActiveOption;
        this.currentlyActiveOption.classList.add('active');
    }

    constructor() {
        super();
        const shadowDOM = this.attachShadow({ mode: 'open' });
        const { divWrapper, searchInput, uL } = this.createDocumentStructure();
        // assignes instance variables (HTML Elements)
        this.divWrapper = divWrapper;
        this.searchInput = searchInput;
        this.uL = uL;

        shadowDOM.appendChild(this.defineDocumentStyle());
        shadowDOM.appendChild(divWrapper);
    }

    connectedCallback() {
        this.defineTypeAheadHandler();
        this.defineMinimumLettersWhenAutocompleteShouldStartWork();

        // Define all listeners/observers
        this.setDropDownListItemSelectionOnClickListener();
        this.setDropDownListItemSelectionOnEnterListener();
        this.setControlPredictionListKeyBoardNavigationListener();
        this.setStopCursorShiftListener();
        this.providerIsReady.promise.then(isReady => {
            this.setTypeAheadListener();
        });
        this.setClickOutsideOfDrowdownWindowObserver();
        this.setMouseOverOptionListener();

    }

    disconnectedCallback() {
        if (this.clickOutsideSubscription) {
            this.clickOutsideSubscription.unsubscribe();
        }
    }

    /**
     * ------------------------------------------
     * Public methods
     * ------------------------------------------
     */

    public registerProvider(provider: (term: string) => Promise<Array<ProviderData>>) {
        this.provider = provider;
        this.providerIsReady.resolver(true);
    }

    /**
     * ------------------------------------------
     * Event Listeners
     * ------------------------------------------
     */

    /**
     * Sets index of the option in the dropdown list
     * on keyboard navigation.
     */
    private setControlPredictionListKeyBoardNavigationListener() {
        // TODO (do we need "document"? Maybe better "UL"?)
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (!this.isInputElementActive || !this.isDropDownVisible) {
                return;
            }
            switch (event.code) {
                case 'ArrowDown':
                    this.currentListNavigationIndex = (this.currentListNavigationIndex + 1) % this.numberOfElementsInTheList;
                    break;
                case 'ArrowUp':
                    this.currentListNavigationIndex = this.currentListNavigationIndex <= 0 ? this.numberOfElementsInTheList - 1 : this.currentListNavigationIndex - 1;
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * Prevents cursor to move in the search input field when user hits
     * Up or Down arrows on the keyboard
     */
    private setStopCursorShiftListener() {
        this.searchInput.addEventListener('keydown', (event: KeyboardEvent) => {
            if (['ArrowDown', 'ArrowUp'].includes(event.code)) {
                event.preventDefault();
            }
        });
    }

    /**
     * Shows/hides options list when user types in the search input field
     */
    private setTypeAheadListener() {
        this.searchInput.addEventListener('input', this.typeAheadHandler);
    }

    private setDropDownListItemSelectionOnClickListener(): void {
        this.uL.addEventListener('click', this.listItemSelectionHandler.bind(this));        
    }

    private setDropDownListItemSelectionOnEnterListener(): void {
        // TODO: change the way how active element is handled when hover over
        // so that this handler can be conformed with click and enter events
        this.searchInput.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter') {
                this.listItemSelectionHandler.call(this, event);
            }
        })
    }

    private setMouseOverOptionListener() {
        this.uL.addEventListener('mouseover', this.toggleActiveLiElementHandler.bind(this));
    }

    /**
     * ------------------------------------------
     * Corresponding Handlers
     * ------------------------------------------
     */
    
    private toggleActiveLiElementHandler(event: MouseEvent) {
        // Do nothing if hover over already highlighted option
        if (!(event.target instanceof HTMLLIElement) || (this.currentlyActiveOption === event.target)) {
            return;
        }

        // remove 'active' class from prev option
        if (this.currentlyActiveOption) {
            this.currentlyActiveOption.classList.toggle('active');
        }

        // make 'active' an element which is hovered over
        const option = event.target;
        option.classList.toggle('active');

        // save current active element and it's position
        this.currentlyActiveOption = option;
        this.currentListNavigationIndex = this.getIndexByOption(option);            
    }

    private listItemSelectionHandler(event: MouseEvent | KeyboardEvent) {
        const dataset = this.currentlyActiveOption.dataset;
        this.saveCurrentSelectedElementData(dataset);
        this.setInputFieldValue(this.currentlyActiveOption.textContent);
        this.dispatchSelectedDataEvent(this.currentSelection);
        this.closeDropdown();
    }

    private defineTypeAheadHandler(): void {
        const waitTime = this.getAttribute('wait');
        if (!waitTime) {
            this.typeAheadHandler = this._typeAheadHandler;
            return;
        }
        const waitTimeNum = +waitTime;
        if (isNaN(waitTimeNum)) {
            throw new Error('wait time should be numeric');
        }

        this.typeAheadHandler = debounce(this._typeAheadHandler, waitTimeNum);
    }

    private _typeAheadHandler = async (event: Event) => {
        this.cleanUpOptions();

        const term = this.searchInput.value;

        if (term.length < this.minimumLettersToStartSearch) {
            this.closeDropdown();
            return;
        }

        const list = await this.provider(term);
        this.uL.style.display = list.length ? 'block' : 'none';
        const documentFragment = document.createDocumentFragment();
        for (const data of list) {
            const option = this.createOption(data);
            documentFragment.appendChild(option);
        }
        this.uL.appendChild(documentFragment);
    }

    /**
     * ------------------------------------------
     * Getters
     * ------------------------------------------
     */

    private get isInputElementActive(): boolean {
        return this.shadowRoot.activeElement === this.searchInput;
    }

    private get isDropDownVisible(): boolean {
        return this.uL.style.display !== 'none';
    }

    private get numberOfElementsInTheList(): number {
        return this.uL.children.length;
    }

    /**
     * ------------------------------------------
     * Methods for building HTML part of the
     * widget
     * ------------------------------------------
     */

    private createDocumentStructure() {
        const divWrapper: HTMLDivElement = document.createElement('div');
        const searchInput: HTMLInputElement = document.createElement('input');
        const uL: HTMLUListElement = document.createElement('ul');

        // enrich DIV
        divWrapper.classList.add('autocomplete-wrapper');

        // enrich INPUT
        searchInput.type = "search";
        searchInput.id = "searchelement";
        searchInput.classList.add('search-element');
        searchInput.autocomplete = "off";
        searchInput.ariaAutoComplete = "list";

        // enrich UL
        uL.id = "autocomplete-list";
        uL.classList.add('list');

        // structure
        divWrapper.appendChild(searchInput);
        divWrapper.appendChild(uL);

        return { divWrapper, searchInput, uL };
    }

    private defineDocumentStyle(): HTMLStyleElement {
        const style: HTMLStyleElement = document.createElement('style');
        style.textContent = `
        :host {
            color: initial;
            font-size: inherit;
        }
        .autocomplete-wrapper {
          display: block;
          position: relative;
        }
        .search-element {
          display: block;
          inline-size: 100%;
          padding-inline: 0.625rem;
          padding-block: 0.6875rem;
          border-radius: 0.625rem;
          font-size: inherit;
          font-family: inherit;
          font-weight: 600;
        }
        .list {
          border-radius: 0.625rem;
          display: none;
          position: absolute;
          list-style: none;
          margin-block-start: 0;
          padding-inline-start: 0;
          background-color: #fff;
          border: 1px solid #b0d1ef;
          z-index: 10;
        }
        .option {
          display: block;
          padding: 5px;
          cursor: pointer;
          user-select: none;
        }
        .option.active {
            color: #fff;
            background-color: #0d3b66;
        }
      `;
        return style;
    }

    /**
     * ------------------------------------------
     * Dropdown (ul tag) specific methods
     * ------------------------------------------
     */

    private createOption(data: ProviderData): HTMLLIElement {
        const option: HTMLLIElement = document.createElement('li');
        option.dataset['key'] = data.key;
        option.textContent = data.textContent;

        for (const [key, value] of Object.entries(data.datasets)) {
            option.dataset[key] = value;
        }

        option.classList.add('option');

        return option;
    }

    private cleanUpOptions() {
        this.uL.innerHTML = "";
        this.currentListNavigationIndex = -1;
        this.currentlyActiveOption = null;
    }

    private getOptionByIndex(optionIndex: number): HTMLLIElement {
        const option = this.uL.children.item(optionIndex) as HTMLLIElement;
        if (!option) {
            throw new Error(`There is no option with index = ${optionIndex}`);
        }
        return option;
    }

    private getIndexByOption(option: HTMLLIElement): number {
        for (let i = 0; i < this.uL.children.length; i++) {
            if (this.uL.children.item(i) === option) {
                return i;
            }
        }
        return -1;
    }
    
    private setClickOutsideOfDrowdownWindowObserver() {
        this.clickOutsideSubscription = ClickObserver.subscribe({
            parent: this,
            callback: (match: boolean) => {
                if (!match) {
                    this.closeDropdown();
                }
            }
        });
    }

    private closeDropdown() {
        this.cleanUpOptions();
        this.uL.style.display = 'none';
    }

    private saveCurrentSelectedElementData(dataset: DOMStringMap) {
        for (const [key, value] of Object.entries(dataset)) {
            this.currentSelection[key] = value;
        }        
    }

    private dispatchSelectedDataEvent(data: any) {
        this.dispatchEvent(new CustomEvent("selected", {detail: data}));
    }    

    /**
     * ------------------------------------------
     * Other
     * ------------------------------------------
     */

    private defineMinimumLettersWhenAutocompleteShouldStartWork() {
        const min = this.getAttribute('min-letters');
        if (!!min && !isNaN(+min)) {
            this.minimumLettersToStartSearch = +min;
        }        
    }

    private setInputFieldValue(value: string) {
        this.searchInput.value = value;
    }
}