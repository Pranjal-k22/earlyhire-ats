import {
  CreateOfferPayload,
  OfferListResponse,
  RespondOfferPayload,
  SingleOfferResponse,
} from "../types/offer";
import { API_BASE } from "./baseUrl";
import { parseApiResponse } from "./clientHelper";

export const createOffer = async (
  payload: CreateOfferPayload
): Promise<SingleOfferResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/offers`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<SingleOfferResponse>(res, "Failed to create offer");
};

export const fetchOfferByApplicationId = async (
  applicationId: string
): Promise<SingleOfferResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/offers/application/${applicationId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<SingleOfferResponse>(res, "Failed to fetch offer");
};

export const fetchMyOffers = async (): Promise<OfferListResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/offers/my`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<OfferListResponse>(res, "Failed to fetch candidate offers");
};

export const approveOffer = async (offerId: string): Promise<SingleOfferResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/offers/${offerId}/approve`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  return parseApiResponse<SingleOfferResponse>(res, "Failed to approve offer");
};

export const extendOffer = async (offerId: string): Promise<SingleOfferResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/offers/${offerId}/extend`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  return parseApiResponse<SingleOfferResponse>(res, "Failed to extend offer");
};

export const respondToOffer = async (
  offerId: string,
  payload: RespondOfferPayload
): Promise<SingleOfferResponse> => {
  const res = await fetch(`${API_BASE}/api/v1/offers/${offerId}/respond`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<SingleOfferResponse>(res, "Failed to respond to offer");
};
