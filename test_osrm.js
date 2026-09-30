async function test() {
  const res = await fetch("https://router.project-osrm.org/route/v1/driving/77.2193804,28.6317695;77.0878,28.4950?overview=full&geometries=geojson&alternatives=true");
  const data = await res.json();
  console.log(data.routes[0].distance, data.routes[0].duration);
}
test();
