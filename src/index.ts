import { City } from './models/db.model';
import './styles.css';
import { AutoCompleterComponent, ProviderData } from './features/components/autocompleter.component';

registerSW();

async function provider(term: string): Promise<Array<ProviderData>> {
  let cities = await getListByTerm(term);
  return cities.map(data => ({ key: data.city, textContent: `${data.city}, ${data.country} (${data.descr})`, datasets: { city: data.city, country: data.country, tz: data.tz, descr: data.descr } }));
}

async function getListByTerm(term: string): Promise<Array<Partial<City>>> {
  const termInLowerCase = term.toLowerCase();
  const response = await fetch(`api/request?term=${termInLowerCase}`);
  const cities = await response.json();
  return cities;
}

function registerSW(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration: ServiceWorkerRegistration) => {
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  }
}

let timezone1: string;
let timezone2: string;

customElements.define("auto-complete", AutoCompleterComponent);

const searchCustomSource: AutoCompleterComponent = document.querySelector('.auto-complete-custom-source');
const searchCustomTarget: AutoCompleterComponent = document.querySelector('.auto-complete-custom-target');

searchCustomSource.registerProvider(provider);
searchCustomTarget.registerProvider(provider);

searchCustomSource.addEventListener('selected', event => {
  const detail = (event as CustomEvent).detail;
  timezone1 = detail['tz'];
  handleOutput();
});

searchCustomTarget.addEventListener('selected', event => {
  const detail = (event as CustomEvent).detail;
  timezone2 = detail['tz'];
  handleOutput();
});

// DATE AND TIME FIELDS
const dt1 = document.getElementById('location1') as HTMLInputElement;
const output = document.querySelector('.target-date-output') as HTMLOutputElement;

dt1.addEventListener('change', event => {
  handleOutput();
});


function handleOutput() {
  if (!timezone1 || !timezone2 || !dt1.value) {
    return;
  }

  const input1Date = new Date(dt1.value);
  const year = input1Date.getFullYear();
  const monthIdx = input1Date.getMonth();
  const day = input1Date.getDate();
  const hours = input1Date.getHours();
  const minutes = input1Date.getMinutes();

  const result = convertTimezones(
    timezone1, 
    timezone2, 
    year,
    monthIdx,
    day,
    hours,
    minutes);
    
    output.value = result.toLocaleString();  
}


function getOffset(iana: string): number {
  const localNow = new Date();
  localNow.setSeconds(0, 0);

  const ianaDate = new Date(localNow.toLocaleString('en-US', {timeZone: iana}));
  const offset = localNow.getTime() - ianaDate.getTime();

  return offset / (1000 * 60);
}

function convertTimezones(srcIana: string, targetIana: string, year: number, monthIdx: number, day: number, hours: number, minutes: number) {

  const date = new Date(year, monthIdx, day, hours, minutes);
  const sourceOffset = getOffset(srcIana);
  const targetOffset = getOffset(targetIana);

  // Set local time with respect to source iana timezone
  date.setMinutes(date.getMinutes() + sourceOffset);
  date.setMinutes(date.getMinutes() - targetOffset);
  return date;
}