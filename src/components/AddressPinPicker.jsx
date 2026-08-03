import { useEffect, useRef, useState } from "react";
import { Crosshair, LoaderCircle, MapPin, Search } from "lucide-react";
import { LeafletCanvas } from "./LeafletCanvas";

const CITY_ALIASES = {
  tbilisi: "თბილისი",
  თბილისი: "თბილისი",
  batumi: "ბათუმი",
  ბათუმი: "ბათუმი",
  kutaisi: "ქუთაისი",
  ქუთაისი: "ქუთაისი",
  rustavi: "რუსთავი",
  რუსთავი: "რუსთავი",
  gori: "გორი",
  გორი: "გორი",
  zugdidi: "ზუგდიდი",
  ზუგდიდი: "ზუგდიდი",
};

function knownCity(value, fallback) {
  return CITY_ALIASES[String(value || "").toLowerCase()] || fallback;
}

async function fetchLocations(parameters, signal) {
  const response = await fetch(`/api/geocode?${parameters}`, { signal });
  if (!response.ok) throw new Error("მისამართის სერვისი დროებით მიუწვდომელია");
  return response.json();
}

export function AddressPinPicker({ city, address, value, onChange }) {
  const [query, setQuery] = useState(() => [city, address].filter(Boolean).join(", "));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("რუკაზე დააჭირეთ ან მოძებნეთ მისამართი");
  const latestRequestRef = useRef(0);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return undefined;
    }
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return undefined;
    }

    const controller = new globalThis.AbortController();
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const timeout = globalThis.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchLocations(`q=${encodeURIComponent(trimmed)}`, controller.signal);
        if (latestRequestRef.current === requestId) setResults(data.results || []);
      } catch (error) {
        if (error.name !== "AbortError") setMessage(error.message);
      } finally {
        if (latestRequestRef.current === requestId) setLoading(false);
      }
    }, 500);

    return () => {
      globalThis.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function selectLocation(location) {
    const next = {
      ...location,
      city: knownCity(location.city, city),
    };
    skipSearchRef.current = true;
    setQuery(location.label);
    setResults([]);
    setMessage("ზუსტი მდებარეობა არჩეულია");
    onChange(next);
  }

  async function reverseLocation(position) {
    onChange({ ...value, ...position });
    setLoading(true);
    setResults([]);
    try {
      const data = await fetchLocations(`mode=reverse&lat=${position.lat}&lng=${position.lng}`);
      const location = data.results?.[0];
      if (location) selectLocation(location);
      else setMessage("კოორდინატები მონიშნულია; მისამართი ვერ მოიძებნა");
    } catch (error) {
      setMessage(`${error.message}; კოორდინატები შენარჩუნებულია`);
    } finally {
      setLoading(false);
    }
  }

  function useCurrentLocation() {
    if (!globalThis.navigator?.geolocation) {
      setMessage("ბრაუზერი GPS მდებარეობას არ უჭერს მხარს");
      return;
    }
    setLoading(true);
    globalThis.navigator.geolocation.getCurrentPosition(
      ({ coords }) => reverseLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => {
        setLoading(false);
        setMessage("მდებარეობაზე წვდომა ვერ მივიღეთ");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }

  const selectedPosition = Number.isFinite(value?.lat) && Number.isFinite(value?.lng)
    ? { lat: value.lat, lng: value.lng }
    : null;

  return (
    <section className="address-pin-picker" data-testid="address-pin-picker">
      <div className="address-search-row">
        <label>
          <Search />
          <input value={query} onInput={(event) => setQuery(event.currentTarget.value)} placeholder="მოძებნეთ ქუჩა და ნომერი" data-testid="address-search" />
          {loading ? <LoaderCircle className="spinning" /> : null}
        </label>
        <button type="button" className="secondary-button" onClick={useCurrentLocation} data-testid="use-current-location">
          <Crosshair />ჩემი მდებარეობა
        </button>
      </div>

      {results.length ? (
        <div className="address-search-results" role="listbox" aria-label="მისამართის ვარიანტები" data-testid="address-results">
          {results.map((result) => (
            <button type="button" role="option" key={`${result.lat}-${result.lng}`} onClick={() => selectLocation(result)}>
              <MapPin /><span><strong>{result.address || result.city}</strong><small>{result.label}</small></span>
            </button>
          ))}
        </div>
      ) : null}

      <LeafletCanvas
        center={selectedPosition ? [selectedPosition.lat, selectedPosition.lng] : [41.7151, 44.8271]}
        selectedPosition={selectedPosition}
        onPositionChange={reverseLocation}
        className="address-picker-map"
        testId="address-map"
      />
      <footer>
        <span><MapPin />{message}</span>
        <strong>{selectedPosition ? `${selectedPosition.lat.toFixed(6)}, ${selectedPosition.lng.toFixed(6)}` : "Lat/Lng არ არის არჩეული"}</strong>
      </footer>
    </section>
  );
}
