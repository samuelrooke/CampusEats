import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";


const RESTAURANT_LOCATIONS = [
  { name: "Campusravita", coords: [61.50395963771167, 23.809278286283007] },
  { name: "Frenckell ja Piha", coords: [61.50013579176667, 23.761066428612047] },
  { name: "Arvo", coords: [61.50734978585821, 23.822517330955765] },
  { name: "Sodexo Linna", coords: [61.4954434378124, 23.777981472788536] },
  { name: "Ravintola Rata", coords: [61.501704871136155, 23.802545440258342] },
  { name: "Finn Medi", coords: [61.50636804211024, 23.812416857447754] },
  { name: "Sodexo Hertsi", coords: [61.4500969824143, 23.856434348206353] },
  { name: "Tori", coords: [61.50793137340112, 23.649810440392258] },
  { name: "Mediapolis", coords: [61.50793137340112, 23.649810440392258] },
  { name: "Food&Co Minerva", coords: [61.49346918231911, 23.777336655599363] },
  { name: "Food&Co Reaktori", coords: [61.44975593893554, 23.858281745797957] },
];

const LeafletMap = ({ center = [61.4972, 23.7610], zoom = 13, style = { width: "100%", height: "300px", borderRadius: "1rem" } }) => (
  <MapContainer
    center={center}
    zoom={zoom}
    style={style}
    scrollWheelZoom={true}
    touchZoom={true}
    doubleClickZoom={true}
    dragging={true}
    zoomControl={true}
  >
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {RESTAURANT_LOCATIONS.map((r) => (
      <Marker key={r.name} position={r.coords}>
        <Popup>{r.name}</Popup>
      </Marker>
    ))}
  </MapContainer>
);

export default LeafletMap;
