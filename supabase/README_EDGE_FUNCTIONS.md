# Guia de Configuração das Edge Functions (Segurança Enterprise)

As Edge Functions atuam como um "cofre seguro" no servidor Supabase, garantindo que as chaves de API do **Google Gemini** e do **Asaas** nunca fiquem visíveis no navegador nem passem por proxies públicos inseguros.

---

## 1. Como Adicionar as Chaves Secretas (Secrets) no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard).
2. Selecione o seu projeto (**luizfelipecanedo2-byte / BJL-Planejados**).
3. No menu lateral, clique em **Project Settings** (ícone de engrenagem) > **Configuration** > **Edge Functions** (ou **Secrets**).
4. Adicione os seguintes Secrets:
   * **`GEMINI_API_KEY`**: Sua chave de API do Google AI Studio.
   * **`ASAAS_API_KEY`**: Sua chave de API do Asaas (começa com `$` se for Sandbox).

---

## 2. Como Implantar as Edge Functions

### Opção A: Pelo Painel do Supabase (Mais Rápido / Sem Linha de Comando)
1. No menu lateral do Supabase, clique em **Edge Functions**.
2. Clique em **New Function**:
   * Nome: `gemini-proxy`
   * Cole o código de `supabase/functions/gemini-proxy/index.ts`.
   * Clique em **Deploy**.
3. Repita o processo para a segunda função:
   * Nome: `asaas-proxy`
   * Cole o código de `supabase/functions/asaas-proxy/index.ts`.
   * Clique em **Deploy**.

---

### Opção B: Pela Linha de Comando (Supabase CLI)
Caso tenha a CLI do Supabase instalada:

```bash
# Login no Supabase
npx supabase login

# Linkar com seu projeto
npx supabase link --project-ref wbbzeaydeyhpbugomxra

# Definir os secrets
npx supabase secrets set GEMINI_API_KEY=sua_chave_gemini_aqui
npx supabase secrets set ASAAS_API_KEY=sua_chave_asaas_aqui

# Deploy das funções
npx supabase functions deploy gemini-proxy --no-verify-jwt
npx supabase functions deploy asaas-proxy --no-verify-jwt
```

---

## 3. Benefícios de Segurança Implementados
1. **Zero chaves no navegador:** A chave não fica visível para quem apertar F12.
2. **Fim do corsproxy.io:** O token bancário do Asaas não é mais enviado para proxies abertos na internet.
3. **Resiliência:** O sistema no frontend possui fallback automático transparente caso as Edge Functions ainda estejam em implantação.
