import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000"
});

export const fetchInsights = async () => {
  const res = await API.get("/insights");
  return res.data;
};

export const rebuildInsights = async () => {
  const res = await API.post("/rebuild-insights");
  return res.data;
};