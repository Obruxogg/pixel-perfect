/**
 * Validação do algoritmo oficial do CPF brasileiro (dígitos verificadores)
 */
export function validateCPF(rawCpf: string): boolean {
  const cpf = (rawCpf || "").replace(/\D/g, "");

  if (cpf.length !== 11) return false;

  // Rejeita sequências repetidas como 111.111.111-11
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

/**
 * Máscara de CPF: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/**
 * Máscara de CEP: 00000-000
 */
export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

/**
 * Calcula a idade com base na data de nascimento (AAAA-MM-DD ou DD/MM/AAAA)
 */
export function calculateAge(birthDateString: string): { age: number; isMinor: boolean } {
  if (!birthDateString) return { age: 0, isMinor: false };

  let birthDate: Date;
  if (birthDateString.includes("/")) {
    const [d, m, y] = birthDateString.split("/").map(Number);
    if (!d || !m || !y) return { age: 0, isMinor: false };
    birthDate = new Date(y, m - 1, d);
  } else {
    birthDate = new Date(birthDateString);
  }

  if (isNaN(birthDate.getTime())) return { age: 0, isMinor: false };

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return { age: Math.max(0, age), isMinor: age < 18 };
}

export interface ViaCEPResponse {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  error?: boolean;
}

/**
 * Busca endereço automático via serviço gratuito ViaCEP
 */
export async function fetchViaCEP(rawCep: string): Promise<ViaCEPResponse | null> {
  const cep = rawCep.replace(/\D/g, "");
  if (cep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.erro) return { street: "", neighborhood: "", city: "", state: "", error: true };

    return {
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch (err) {
    console.error("Erro ao consultar ViaCEP:", err);
    return null;
  }
}
