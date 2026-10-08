// Company identification exactly as in the CNPJ card (Comprovante de Inscrição e de Situação Cadastral).
// Kept as constants (not only in the database) so it is already in the HTML the server sends, which is what
// crawlers and reviewers read. The apartment complement of the registered address is left out on purpose.
export const COMPANY = {
  legalName: "ALNA COMMERCE LTDA",
  cnpj: "57.135.009/0001-27",
  street: "R. Luiz Rafael Flor, 450",
  neighborhood: "Nova Brasília",
  city: "Brusque",
  state: "SC",
  zip: "88.352-553",
  /** One-line address for the footer and the contact page. */
  addressLine: "R. Luiz Rafael Flor, 450, Nova Brasília, Brusque/SC, CEP 88.352-553",
} as const;
