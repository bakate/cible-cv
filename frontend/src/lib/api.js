import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 120000 });

export const parsePdf = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/parse/pdf", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const parseUrl = async (url) => {
  const { data } = await api.post("/parse/url", { url });
  return data;
};

export const generate = async (payload) => {
  const { data } = await api.post("/generate", payload);
  return data;
};

export const listGenerations = async () => {
  const { data } = await api.get("/generations");
  return data;
};

export const getGeneration = async (id) => {
  const { data } = await api.get(`/generations/${id}`);
  return data;
};

export const updateGeneration = async (id, patch) => {
  const { data } = await api.put(`/generations/${id}`, patch);
  return data;
};

export const deleteGeneration = async (id) => {
  const { data } = await api.delete(`/generations/${id}`);
  return data;
};
