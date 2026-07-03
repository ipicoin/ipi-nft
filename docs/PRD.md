# PRD — Standard i aplikacja NFT w IPI (`ipi-nft`)

> Status: DRAFT do zatwierdzenia
> Fala: 3 (roadmapa IPI)
> Domyka issue: `ipicoin/ipi-nft#1` (undefined functionality) oraz realizuje `ipicoin/ipi-nft#2`
> Powiązanie roadmapowe: `ipicoin/universal-independency-declaration#1`

---

## 1. Streszczenie

Repozytorium `ipi-nft` jest dziś gołym boilerplate wygenerowanym przez
`create-cosmos-app` (frontend Next.js + Interchain JS Stack) i nie ma
zdefiniowanej funkcjonalności — dokładnie to zgłasza issue #1. Ten dokument
(PRD) definiuje, **po co istnieje `ipi-nft`**, jaki **standard NFT** wdraża
(CosmWasm **cw721**) oraz jak wygląda **aplikacja** (kontrakt + frontend)
umożliwiająca mint, transfer i przeglądanie kolekcji NFT w łańcuchu IPI.

PRD jest warunkiem wstępnym implementacji (BLOKADA: najpierw PRD, potem kod)
i po zatwierdzeniu zamyka #1, dostarczając brakujący „clear picture".

---

## 2. Cel (Goals)

- **G1.** Dać ekosystemowi IPI kanoniczny, audytowalny standard tokenów
  niewymiennych oparty o sprawdzony wzorzec **cw721-base** (CosmWasm).
- **G2.** Umożliwić dowolnemu użytkownikowi wybicie (mint), przeniesienie
  (transfer) i przeglądanie NFT z poziomu przeglądarki, bez zaufanego
  pośrednika.
- **G3.** Zapewnić trwałe, zdecentralizowane przechowywanie assetów i metadanych
  (IPFS / Arweave) — brak zależności od pojedynczego serwera.
- **G4.** Spiąć frontend z tożsamością i podpisem przez `wallet-core.js`
  (Fala 2) oraz z siecią przez RPC `https://ipicoin.eu/rpc`.

### Cele poza zakresem tej wersji (Non-goals / patrz §12)

- Pełny marketplace z księgą zleceń i eskrowem.
- Royalties egzekwowane on-chain na poziomie protokołu.
- Mosty cross-chain (IBC/ICS-721) i frakcjonalizacja NFT.

---

## 3. Użytkownicy i persony

| Persona | Potrzeba | Kluczowe funkcje |
| --- | --- | --- |
| **Twórca kolekcji** | Wydać kolekcję i wybijać tokeny | mint, definicja metadanych, upload assetu |
| **Kolekcjoner / posiadacz** | Trzymać i przesyłać NFT | transfer, approve, przeglądanie „moje NFT" |
| **Przeglądający (gość)** | Oglądać kolekcje i pojedyncze tokeny | widok kolekcji, widok tokenu, metadane |
| **Deweloper integrujący** | Programowo czytać/pisać NFT | typy z ts-codegen, zapytania cw721, RPC |

---

## 4. Zakres MVP

**W zakresie MVP:**

1. Kontrakt cw721 (na bazie `cw721-base`) wdrożony w łańcuchu IPI.
2. Metadane tokenu zgodne z rozszerzeniem `cw721-metadata-onchain` **lub**
   `token_uri` wskazujący na IPFS/Arweave (patrz §6).
3. Frontend: połączenie portfela, **mint**, **transfer**, **przeglądanie
   kolekcji**, **widok pojedynczego tokenu z metadanymi**.
4. Upload assetu + JSON metadanych na IPFS/Arweave przed mintem.
5. Broadcast transakcji przez `ipi-rpc` (`https://ipicoin.eu/rpc`),
   podpis przez `wallet-core.js`.
6. Test e2e: **mint → transfer → query owner**.

**Poza MVP (later):** royalties, marketplace, burn UI (kontrakt wspiera burn,
UI opcjonalne w MVP), batch mint, aukcje.

---

## 5. Standard NFT

### 5.1 Wybór: cw721-base + rozszerzenia

`ipi-nft` przyjmuje **CosmWasm cw721** jako SSOT standardu, ponieważ:

- to de facto standard NFT w ekosystemie Cosmos/CosmWasm (odpowiednik ERC-721),
- ma dojrzałą, audytowaną referencyjną implementację `cw721-base`,
- posiada gotowe rozszerzenia metadanych i kompatybilne narzędzia
  (ts-codegen generuje z niego typy TypeScript).

Bazujemy na `cw721-base`; kontrakt IPI (`ipi-cw721`) instancjonuje ten wzorzec
i dokłada, w razie potrzeby, minimalne rozszerzenia (np. `royalty_info` jako
pole metadanych — patrz later).

### 5.2 Wiadomości kontraktu (interfejs)

**Execute:**
`mint`, `transfer_nft`, `send_nft`, `approve`, `revoke`,
`approve_all`, `revoke_all`, `burn`.

**Query:**
`owner_of`, `approval` / `approvals`, `num_tokens`, `contract_info`,
`nft_info`, `all_nft_info`, `tokens` (per owner), `all_tokens`.

### 5.3 Metadane: on-chain vs off-chain

| Wariant | Gdzie | Zalety | Wady | Kiedy |
| --- | --- | --- | --- | --- |
| **On-chain** (`cw721-metadata-onchain`) | pełne metadane w stanie kontraktu | niezmienność, brak zależności zewnętrznych, atomowość | koszt gazu, limit rozmiaru, brak assetów binarnych | małe kolekcje, metadane krytyczne |
| **Off-chain** (`token_uri` → IPFS/Arweave) | w kontrakcie tylko URI + hash | tanie, dowolny rozmiar, obraz/wideo | wymaga trwałości storage, integralność przez hash | domyślne dla MVP |

**Decyzja MVP:** wariant **hybrydowy** — na łańcuchu przechowujemy `token_uri`
(link IPFS `ipfs://CID` lub Arweave `ar://TXID`) **oraz** kluczowe pola
identyfikacyjne (`name`, opcjonalnie `content_hash`) dla integralności; ciężki
asset (obraz/wideo) i pełny JSON metadanych leżą off-chain. To kompromis
koszt/trwałość/immutability.

### 5.4 Przechowywanie assetów — IPFS / Arweave (uzasadnienie)

- **IPFS** (fork org `helia` — JS IPFS): adresowanie treścią (CID = hash),
  weryfikowalna integralność, szeroki ekosystem bramek i pinningu. Wymaga
  pinningu dla trwałości.
- **Arweave** (fork org `arweave-js`): „permaweb" — jednorazowa opłata za trwałe
  przechowywanie, idealne dla metadanych, które nigdy nie powinny zniknąć.

Strategia: **asset + JSON metadanych na IPFS** (helia) jako domyślne, z opcją
**Arweave** (arweave-js) dla trwałości „na zawsze". Na łańcuch trafia tylko
odnośnik + hash — brak zależności od centralnego serwera plików.

---

## 6. Model danych (schema metadanych)

Schema zgodna z konwencją metadanych NFT (kompatybilna z OpenSea-style +
cw721):

```jsonc
{
  "name": "IPI Genesis #1",              // nazwa tokenu
  "description": "Pierwszy NFT w IPI",   // opis
  "image": "ipfs://<CID>/1.png",         // asset (IPFS/Arweave)
  "image_hash": "<sha256>",              // integralność assetu (opcjonalne)
  "external_url": "https://ipi.io/nft/1",
  "animation_url": "ipfs://<CID>/1.mp4", // opcjonalne (wideo/audio)
  "attributes": [                          // cechy / traity
    { "trait_type": "Rarity", "value": "Legendary" },
    { "trait_type": "Level", "value": 7, "display_type": "number" }
  ],
  "royalty": {                             // LATER — informacyjne w MVP
    "payment_address": "ipi1...",
    "share": "0.05"
  }
}
```

**On-chain (stan kontraktu, per token):**

| Pole | Typ | Opis |
| --- | --- | --- |
| `token_id` | string | unikalny identyfikator w kolekcji |
| `owner` | Addr | właściciel |
| `approvals` | lista | adresy z uprawnieniem transferu |
| `token_uri` | string? | `ipfs://` / `ar://` → JSON metadanych |
| `extension` | struct? | opcjonalne metadane on-chain (name, hash) |

**Kolekcja (`contract_info`):** `name`, `symbol`, `minter`.

---

## 7. Funkcje

### MVP

- **Mint** — twórca uploaduje asset + JSON (IPFS/Arweave), podpisuje i wysyła
  `mint { token_id, owner, token_uri, extension }`.
- **Transfer** — posiadacz wykonuje `transfer_nft { recipient, token_id }`.
- **Przeglądanie kolekcji** — lista tokenów (`all_tokens`, `tokens` per owner)
  + `nft_info` do pobrania metadanych i renderu.
- **Widok tokenu / metadane** — pobranie `token_uri`, fetch z bramy IPFS/Arweave,
  render obrazu i atrybutów.
- **Approve / Revoke** — delegacja prawa transferu.

### Later (poza MVP)

- **Royalties** — pole `royalty` w metadanych + egzekucja przy sprzedaży
  (zależne od marketplace).
- **Marketplace** — listing, oferta, sprzedaż, eskrow.
- **Burn (UI)** — kontrakt wspiera; interfejs w kolejnej iteracji.

---

## 8. Integracje

| Warstwa | Narzędzie | Rola |
| --- | --- | --- |
| **Kontrakt** | CosmWasm `cw721-base`, `cw-template` (scaffold), **ts-codegen** | standard NFT + typy TS z ABI kontraktu |
| **Podpis / tożsamość** | `wallet-core.js` (Fala 2) | połączenie portfela, podpisywanie tx mint/transfer |
| **Storage** | IPFS (`helia`), Arweave (`arweave-js`) — forki org | assety + JSON metadanych, adresowanie treścią |
| **Sieć / broadcast** | RPC `https://ipicoin.eu/rpc` (ipi-rpc, Fala 2) | zapytania stanu + rozgłaszanie podpisanych tx |
| **Frontend** | Next.js + Interchain UI (istniejący boilerplate) | UI mint/transfer/kolekcje |

Przepływ mint (end-to-end):
`asset → upload IPFS/Arweave → JSON metadanych → upload → token_uri`
→ `wallet-core.js` podpisuje `mint` → broadcast przez `ipi-rpc` →
render z `nft_info` + fetch metadanych.

---

## 9. User stories + kryteria akceptacji

**US-1 (Mint).** Jako twórca chcę wybić NFT, aby zaistniał w łańcuchu IPI.
- [ ] Po uploadzie assetu otrzymuję `ipfs://`/`ar://` URI.
- [ ] Po podpisie portfelem tx trafia na łańcuch przez `ipi-rpc`.
- [ ] `owner_of(token_id)` zwraca mój adres.

**US-2 (Transfer).** Jako posiadacz chcę przenieść NFT do innego adresu.
- [ ] `transfer_nft` przechodzi po podpisie.
- [ ] `owner_of(token_id)` zwraca adres odbiorcy.
- [ ] Nie-właściciel bez `approve` nie może przenieść (tx odrzucona).

**US-3 (Przeglądanie kolekcji).** Jako gość chcę zobaczyć wszystkie tokeny.
- [ ] Lista renderuje się z `all_tokens` + `nft_info`.
- [ ] Metadane i obraz ładują się z bramy IPFS/Arweave.
- [ ] `num_tokens` zgadza się z liczbą pozycji.

**US-4 (Moje NFT).** Jako posiadacz chcę widzieć tylko swoje tokeny.
- [ ] `tokens(owner)` filtruje poprawnie po połączonym adresie.

**US-5 (Metadane).** Jako przeglądający chcę widzieć nazwę, opis i atrybuty.
- [ ] JSON zgodny ze schematem z §6 renderuje się w widoku tokenu.
- [ ] `image_hash` (jeśli obecny) zgadza się z pobranym assetem.

**Globalne kryterium akceptacji (z issue #2):**
- [ ] PRD zatwierdzony i #1 zamknięte.
- [ ] Kontrakt cw721 (mint/transfer/burn/approve) utworzony.
- [ ] Zapytania (`owner_of`, `tokens`, `num_tokens`) działają.
- [ ] Frontend spięty z `wallet-core` (podpis) i `ipi-rpc` (broadcast).
- [ ] Test e2e: mint → transfer → query owner.

---

## 10. Wymagania niefunkcjonalne

- **Bezpieczeństwo:** klucze nigdy nie opuszczają `wallet-core.js`; walidacja
  właściciela/approve po stronie kontraktu; weryfikacja `image_hash`.
- **Trwałość:** pinning IPFS lub Arweave dla assetów produkcyjnych.
- **Wydajność:** paginacja `all_tokens`/`tokens` (start_after, limit).
- **DevX:** typy generowane przez ts-codegen; jeden RPC endpoint w configu.

---

## 11. Zamyka #1

Issue #1 („undefined functionality... request for precising what it should do")
zgłasza brak definicji, czym jest `ipi-nft`. Niniejszy PRD dostarcza brakujący
opis:

- **Czym jest:** aplikacja + standard NFT (CosmWasm cw721) dla łańcucha IPI.
- **Po co:** mint/transfer/przeglądanie NFT bez pośrednika, z assetami na
  IPFS/Arweave i podpisem przez `wallet-core.js`.
- **Standard:** cw721-base + rozszerzenia metadanych (§5), model danych (§6).
- **Zakres:** MVP (§4) + roadmapa later (royalties, marketplace).

Po zatwierdzeniu tego PRD issue #1 może zostać **zamknięte** jako
doprecyzowane. Kontekst roadmapowy: `universal-independency-declaration#1`.

---

## 12. Poza zakresem (Out-of-scope)

- Marketplace z eskrowem i księgą zleceń.
- Royalties egzekwowane on-chain na poziomie protokołu (MVP: pole informacyjne).
- Cross-chain / ICS-721 (IBC NFT).
- Frakcjonalizacja i wypożyczanie NFT.
- Batch/lazy mint, aukcje, whitelisty.
- Zaawansowana moderacja treści assetów.

---

## 13. Ryzyka i założenia

- **Zależność Fali 2:** `wallet-core.js` i `ipi-rpc` muszą być gotowe przed
  implementacją frontendu (BLOKADA z issue #2).
- **Trwałość IPFS:** bez pinningu/Arweave assety mogą zniknąć — mitigacja przez
  Arweave dla produkcji.
- **Zgodność cw721:** wybór wersji `cw721-base` musi być zgodny z runtime
  CosmWasm w łańcuchu IPI.
