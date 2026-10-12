const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const locationButton = document.querySelector("#location-button");
const message = document.querySelector("#message");
const weatherPanel = document.querySelector("#weather-panel");

const els = {
  place: document.querySelector("#place-name"),
  date: document.querySelector("#current-date"),
  icon: document.querySelector("#weather-icon"),
  temp: document.querySelector("#temperature"),
  condition: document.querySelector("#condition"),
  feels: document.querySelector("#feels-like"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind"),
  cloud: document.querySelector("#cloud"),
  forecast: document.querySelector("#forecast")
};

const weatherCodes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Thunderstorm with hail", "⛈️"]
};

function getWeather(code) {
  return weatherCodes[code] || ["Unknown conditions", "🌡️"];
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#c24141" : "";
}

async function findCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not search for that city. Please try again.");
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Check the spelling and try again.");
  }
  const place = data.results[0];
  return {
    name: place.name,
    country: place.country || "",
    latitude: place.latitude,
    longitude: place.longitude
  };
}

async function loadWeather(place) {
  showMessage("Getting the latest forecast…");
  searchButton.disabled = true;
  searchButton.textContent = "Loading…";

  try {
    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "5"
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error("Weather data is unavailable right now. Please try again.");
    const data = await response.json();
    renderWeather(place, data);
    weatherPanel.hidden = false;
    showMessage(`Showing live weather for ${place.name}.`);
  } catch (error) {
    showMessage(error.message || "Something went wrong. Please try again.", true);
  } finally {
    searchButton.disabled = false;
    searchButton.innerHTML = 'Search <span aria-hidden="true">→</span>';
  }
}

function renderWeather(place, data) {
  const current = data.current;
  const [description, icon] = getWeather(current.weather_code);
  els.place.textContent = [place.name, place.country].filter(Boolean).join(", ");
  els.date.textContent = new Date(current.time).toLocaleString(undefined, {
    weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
  els.icon.textContent = icon;
  els.temp.textContent = `${Math.round(current.temperature_2m)}°`;
  els.condition.textContent = description;
  els.feels.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
  els.humidity.textContent = `${current.relative_humidity_2m}%`;
  els.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  els.cloud.textContent = `${current.cloud_cover}%`;

  els.forecast.innerHTML = "";
  data.daily.time.forEach((date, index) => {
    const [dayDescription, dayIcon] = getWeather(data.daily.weather_code[index]);
    const dayLabel = index === 0 ? "Today" : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
    const rainChance = data.daily.precipitation_probability_max?.[index];
    const card = document.createElement("article");
    card.className = "forecast-day";
    card.innerHTML = `
      <p class="day">${dayLabel}</p>
      <div class="icon" title="${dayDescription}">${dayIcon}</div>
      <div><span class="high">${Math.round(data.daily.temperature_2m_max[index])}°</span><span class="low">${Math.round(data.daily.temperature_2m_min[index])}°</span></div>
      <p class="rain">${rainChance == null ? "Daily forecast" : `☂ ${rainChance}% chance`}</p>
    `;
    els.forecast.appendChild(card);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) {
    showMessage("Please enter a city name.", true);
    return;
  }
  try {
    showMessage("Searching for your city…");
    const place = await findCity(city);
    await loadWeather(place);
  } catch (error) {
    showMessage(error.message || "Could not find that city.", true);
  }
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showMessage("Your browser does not support location. Search for a city instead.", true);
    return;
  }
  showMessage("Requesting your location…");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      await loadWeather({ name: "Your location", country: "", latitude, longitude });
    },
    () => showMessage("Location access was denied or unavailable. Search for a city instead.", true),
    { enableHighAccuracy: false, timeout: 10000 }
  );
});

// Load a sample city on startup so the app is useful immediately.
(async function init() {
  try {
    const place = await findCity("Karachi");
    await loadWeather(place);
  } catch {
    showMessage("Search for a city to see its current weather.");
  }
})();
