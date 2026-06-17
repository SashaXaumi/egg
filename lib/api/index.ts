import { sha256 } from 'js-sha256';

import { ei } from '../proto';
import { decodeMessage } from './decode';
import { encodeMessage } from './encode';
import { APP_BUILD, APP_VERSION, CLIENT_VERSION, PLATFORM, PLATFORM_STRING } from './version';

export * from './decode';
export * from './encode';
export * from './utils';
export * from './version';

// Same-origin proxy to the Egg, Inc. API. Each deployment serves /api/* via a
// rewrite to https://www.auxbrain.com (see each site's _redirects), and the dev
// servers proxy it via vite.config server.proxy. This keeps the fork
// self-contained with no cross-origin CORS dependency.
const API_ROOT = '/api';

// A handful of /ei_ctx/* endpoints (notably get_contract_player_info) are
// authenticated and reject unsigned requests to www.auxbrain.com with HTTP 400.
// carpet's auth worker signs them and forwards to auxbrain; it sets
// Access-Control-Allow-Origin: *, so the browser may call it cross-origin.
// Only the endpoints that REQUIRE auth use this root — the rest stay on the
// same-origin /api proxy (the worker 403s e.g. get_contracts_archive).
const AUTH_API_ROOT = 'https://egg-auth-worker.carpet.workers.dev';

const CONFIG_GIST_URL =
  'https://gist.githubusercontent.com/carpetsage/373992bc6c5e00f8abd39dfb752845c0/raw/config.json';
const TIMEOUT = 30000;

// A valid userId donated by a volunteer.
export const defaultUserId = atob('RUk2MjkxOTQwOTY4MjM1MDA4');

/**
 * Makes an API request.
 * @param endpoint - Path of API endpoint, e.g. /ei/coop_status.
 * @param encodedPayload - base64-encoded request payload.
 * @param apiRoot - Optional root URL override (defaults to the same-origin /api
 *   proxy). Used to route authenticated /ei_ctx/* endpoints via AUTH_API_ROOT.
 * @returns base64-encoded response payload.
 * @throws Throws an error on network failure (including timeout) or non-2XX response.
 */
export async function request(endpoint: string, encodedPayload: string, apiRoot?: string): Promise<string> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), TIMEOUT);
  const url = (apiRoot ?? API_ROOT) + endpoint;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodedPayload}`,
      signal: controller.signal,
    });
    const text = await resp.text();
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return text;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`POST ${url}: timeout after ${TIMEOUT}ms.`, { cause: e });
    } else if (e instanceof TypeError) {
      throw new TypeError(
        `POST ${url}: ${e} ` +
          `(please check any ad/content blocking solution you might be using, e.g. uBlock, Brave, Pi-hole, NextDNS, etc.)`,
        { cause: e }
      );
    } else {
      throw new Error(`POST ${url} ${e}`, { cause: e });
    }
  }
}

/**
 * @param userId
 * @returns
 * @throws
 */
export async function requestContractsArchive(userId: string): Promise<ei.IContractsArchive> {
  userId = processUserId(userId);
  const requestPayload = basicRequestInfo(userId);
  const encodedRequestPayload = encodeMessage(ei.BasicRequestInfo, requestPayload);
  const encodedResponsePayload = await request('/ei_ctx/get_contracts_archive', encodedRequestPayload);
  return decodeMessage(ei.ContractsArchive, encodedResponsePayload, true) as ei.IContractsArchive;
}

export async function requestContractsInfo(
  contractIdentifiers: string[],
  userId?: string
): Promise<ei.IContractsInfoResponse> {
  userId = userId ?? defaultUserId;
  const requestPayload: ei.IContractsInfoRequest = {
    rinfo: basicRequestInfo(userId),
    contractIdentifiers,
    clientVersion: CLIENT_VERSION,
  };
  const encodedRequestPayload = encodeMessage(ei.ContractsInfoRequest, requestPayload);
  // Authenticated endpoint: plain www.auxbrain.com returns an empty contract
  // list for re-run/old contracts, so route through the auth worker (which
  // returns the full definitions). Without this, coop.contract never resolves
  // for re-runs and the dashboard falls back to a save lookup that can fail.
  const encodedResponsePayload = await request('/ei_ctx/get_contracts_info', encodedRequestPayload, AUTH_API_ROOT);
  return decodeMessage(ei.ContractsInfoResponse, encodedResponsePayload, true) as ei.IContractsInfoResponse;
}

export async function resolveLocalContracts(
  localContracts: ei.ILocalContract[],
  userId?: string
): Promise<void> {
  const identifiers = [
    ...new Set(localContracts.filter(c => !c.contract).map(c => c.contractIdentifier).filter((id): id is string => !!id)),
  ];
  if (identifiers.length === 0) {
    return;
  }
  try {
    const response = await requestContractsInfo(identifiers, userId);
    const contractMap = new Map((response.contracts || []).map(c => [c.identifier!, c]));
    for (const localContract of localContracts) {
      if (!localContract.contract && localContract.contractIdentifier && contractMap.has(localContract.contractIdentifier)) {
        localContract.contract = contractMap.get(localContract.contractIdentifier)!;
      }
    }
  } catch (e) {
    console.warn('Failed to resolve contract info:', e);
  }
}

export async function resolveContractsInBackup(backup: ei.IBackup, userId?: string): Promise<void> {
  const all = [...(backup.contracts?.contracts || []), ...(backup.contracts?.archive || [])];
  await resolveLocalContracts(all, userId);
}

/**
 * Fetches the player's contract-player info (grade, total/season CXP, soul
 * power, season progress, etc.) from the authenticated
 * `/ei_ctx/get_contract_player_info` endpoint.
 *
 * As of a game-API change, the backup payload no longer populates
 * `backup.contracts.lastCpi`, so this must be fetched separately. The response
 * is the same `ContractPlayerInfo` object that used to live in the backup.
 * (Ported from upstream carpetsage/egg.) This endpoint is authenticated:
 * www.auxbrain.com returns HTTP 400 for unsigned requests, so it is routed
 * through AUTH_API_ROOT (carpet's auth worker) rather than the /api proxy.
 */
export async function requestContractPlayerInfo(userId?: string): Promise<ei.IContractPlayerInfo> {
  userId = userId ?? defaultUserId;
  const requestPayload = basicRequestInfo(userId);
  const encodedRequestPayload = encodeMessage(ei.BasicRequestInfo, requestPayload);
  const encodedResponsePayload = await request(
    '/ei_ctx/get_contract_player_info',
    encodedRequestPayload,
    AUTH_API_ROOT
  );
  return decodeMessage(ei.ContractPlayerInfo, encodedResponsePayload, true) as ei.IContractPlayerInfo;
}

/**
 * Fetches the player's ContractPlayerInfo and writes it back into the backup as
 * `backup.contracts.lastCpi` (mutating in place), so the rest of the codebase
 * can keep reading `backup.contracts.lastCpi` as if the backup had populated it.
 * Call after requestFirstContact + resolveContractsInBackup. On failure,
 * `lastCpi` is left untouched (callers see the same null state as before).
 */
export async function resolveContractPlayerInfo(backup: ei.IBackup, userId?: string): Promise<void> {
  try {
    const cpi = await requestContractPlayerInfo(userId);
    if (!backup.contracts) {
      backup.contracts = {};
    }
    backup.contracts.lastCpi = cpi;
  } catch (e) {
    console.warn('Failed to resolve contract player info:', e);
  }
}

export async function requestShellShowcase(userId?: string): Promise<ei.IShellShowcaseListingSet> {
  userId = userId ?? defaultUserId;
  const requestPayload = basicRequestInfo(userId);
  const encodedRequestPayload = encodeMessage(ei.BasicRequestInfo, requestPayload);
  const encodedResponsePayload = await request('/ei/get_shell_showcase', encodedRequestPayload);
  return decodeMessage(ei.ShellShowcaseListingSet, encodedResponsePayload, false) as ei.IShellShowcaseListingSet;
}

export async function joinCoopRequest(
  contractId: string,
  coopCode: string,
  userId?: string
): Promise<ei.IJoinCoopResponse> {
  userId = userId ?? defaultUserId;
  const requestPayload: ei.IJoinCoopRequest = {
    rinfo: basicRequestInfo(userId),
    contractIdentifier: contractId,
    coopIdentifier: coopCode,
    userId,
    clientVersion: CLIENT_VERSION,
  };
  const encodedRequestPayload = encodeMessage(ei.ContractCoopStatusRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/coop_status_basic', encodedRequestPayload);
  return decodeMessage(ei.JoinCoopResponse, encodedResponsePayload, true) as ei.IJoinCoopResponse;
}

export async function requestCoopStatusBasic(
  contractId: string,
  coopCode: string,
  userId?: string
): Promise<ei.IJoinCoopResponse> {
  userId = userId ?? defaultUserId;
  const requestPayload: ei.IContractCoopStatusRequest = {
    rinfo: basicRequestInfo(userId),
    contractIdentifier: contractId,
    coopIdentifier: coopCode,
    userId,
    clientVersion: CLIENT_VERSION,
  };
  const encodedRequestPayload = encodeMessage(ei.ContractCoopStatusRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/coop_status_basic', encodedRequestPayload);
  return decodeMessage(ei.JoinCoopResponse, encodedResponsePayload, true) as ei.IJoinCoopResponse;
}

/**
 * Pulls ConfigResponse json from gist - proto for ConfigResponse is broken in some
 * way I don't understand and have spent too long trying to fix
 * @param [userId]
 * @returns
 * @throws
 */
export async function requestConfig(_userid?: string): Promise<ei.IConfigResponse> {
  try {
    const resp = await fetch(CONFIG_GIST_URL);
    const text = await resp.text();
    const config = JSON.parse(text);
    return ei.ConfigResponse.fromObject(config) as ei.ConfigResponse;
  } catch (e) {
    throw new Error(`Error fetching config from: ${CONFIG_GIST_URL} : ${e}`);
  }
}

/**
 * @param [userId]
 * @returns
 * @throws
 */
export async function requestPeriodicals(userId?: string): Promise<ei.IPeriodicalsResponse> {
  // A valid userId is required for a complete response.
  userId = userId ?? defaultUserId;
  const requestPayload: ei.IGetPeriodicalsRequest = {
    rinfo: basicRequestInfo(userId),
  };
  const encodedRequestPayload = encodeMessage(ei.GetPeriodicalsRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/get_periodicals', encodedRequestPayload);
  return decodeMessage(ei.PeriodicalsResponse, encodedResponsePayload, true) as ei.IPeriodicalsResponse;
}

/**
 * @param userId
 * @returns
 * @throws
 */
export async function requestFirstContact(userId: string): Promise<ei.IEggIncFirstContactResponse> {
  userId = processUserId(userId);
  const requestPayload: ei.IEggIncFirstContactRequest = {
    rinfo: basicRequestInfo(''),
    eiUserId: userId,
    deviceId: 'wasmegg', // This is actually bot_name for /ei/bot_first_contact, operating on an honor system.
    clientVersion: CLIENT_VERSION,
    platform: PLATFORM,
  };
  const encodedRequestPayload = encodeMessage(ei.EggIncFirstContactRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/bot_first_contact', encodedRequestPayload);
  return decodeMessage(ei.EggIncFirstContactResponse, encodedResponsePayload, false) as ei.IEggIncFirstContactResponse;
}

/**
 * @param contractId
 * @param coopCode
 * @param [userId]
 * @returns
 * @throws
 */
export async function requestCoopStatus(
  contractId: string,
  coopCode: string,
  userId?: string
): Promise<ei.IContractCoopStatusResponse> {
  // A valid userId is now required.
  userId = userId ?? defaultUserId;
  const requestPayload: ei.IContractCoopStatusRequest = {
    rinfo: basicRequestInfo(userId),
    contractIdentifier: contractId,
    coopIdentifier: coopCode,
    userId,
    clientVersion: CLIENT_VERSION,
  };
  const encodedRequestPayload = encodeMessage(ei.ContractCoopStatusRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/coop_status_bot', encodedRequestPayload);
  const status = decodeMessage(
    ei.ContractCoopStatusResponse,
    encodedResponsePayload,
    true
  ) as ei.IContractCoopStatusResponse;
  if (!status.clientTimestamp) {
    status.clientTimestamp = Date.now() / 1000;
  }
  return status;
}
/**
 * @param contractId
 * @param coopCode
 * @param league - 0 for elite, 1 for standard.
 * @param grade - 0 for undefined, 1-5 for c,b,a,aa,aaa
 * @returns
 * @throws
 */
export async function requestQueryCoop(
  contractId: string,
  coopCode: string,
  league: number | undefined,
  grade: number | undefined,
  userId?: string
): Promise<ei.IQueryCoopResponse> {
  userId = userId ?? defaultUserId;
  const requestPayload: ei.IQueryCoopRequest = {
    rinfo: basicRequestInfo(userId),
    contractIdentifier: contractId,
    coopIdentifier: coopCode,
    grade: ei.Contract.PlayerGrade.GRADE_A,
  };
  const encodedRequestPayload = encodeMessage(ei.QueryCoopRequest, requestPayload);
  const encodedResponsePayload = await request('/ei/query_coop', encodedRequestPayload);
  return decodeMessage(ei.QueryCoopResponse, encodedResponsePayload, false) as ei.IQueryCoopResponse;
}

/**
 * @param userId
 * @param missionId
 * @returns
 * @throws
 */
export async function requestAfxCompleteMission(
  userId: string,
  missionId: string
): Promise<ei.ICompleteMissionResponse> {
  userId = processUserId(userId);
  return decodeCompleteMissionResponse(await requestAfxCompleteMissionRaw(userId, missionId));
}

export async function requestAfxCompleteMissionRaw(userId: string, missionId: string): Promise<string> {
  userId = processUserId(userId);
  const requestPayload: ei.IMissionRequest = {
    eiUserId: userId,
    info: {
      identifier: missionId,
    },
    rinfo: basicRequestInfo(userId),
  };
  const encodedRequestPayload = encodeMessage(ei.MissionRequest, requestPayload);
  return await request('/ei_afx/complete_mission', encodedRequestPayload);
}

export function decodeCompleteMissionResponse(payload: string): ei.ICompleteMissionResponse {
  return decodeMessage(ei.CompleteMissionResponse, payload, true) as ei.ICompleteMissionResponse;
}

export function basicRequestInfo(userId: string): ei.IBasicRequestInfo {
  return {
    eiUserId: userId,
    clientVersion: CLIENT_VERSION,
    version: APP_VERSION,
    build: APP_BUILD,
    platform: PLATFORM_STRING,
  };
}

const userIdSha256Blacklist = [
  'bba75a6d240f86d6a43d76e8e231d7b5f9a83c3078b2c7998290aad1660a50f9',
  '773b99e5d2076c6597655cca7b37124061822eff9b5b4b0f53f985eaa8476f5b',
];

// Enforces a blacklist, but allow 'mk2!EI...' as the super user bypass.
function processUserId(userId: string): string {
  if (userId.startsWith('mk2!')) {
    return userId.slice(4);
  }
  if (userIdSha256Blacklist.includes(sha256(userId))) {
    throw new Error(`${userId}: this ID has been blacklisted`);
  }
  return userId;
}
