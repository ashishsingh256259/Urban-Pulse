async function test() {
  const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=Connaught+Place,+New+Delhi", {
    headers: { "User-Agent": "UrbanPulse/1.0" }
  });
  const data = await res.json();
  console.log(data[0]);
}
test();
