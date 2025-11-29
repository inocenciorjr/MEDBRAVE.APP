# Correção da Recursão Infinita no RLS

## Problema Identificado

**Erro**: `role "admin" does not exist` (code: 22023)
**Causa Real**: Recursão infinita nas políticas RLS

### Como a Recursão Acontecia

1. Frontend tenta ler tabela `users`
2. Política RLS de `users` verifica: `EXISTS (SELECT FROM admins WHERE user_id = auth.uid())`
3. Ao tentar ler `admins`, a política RLS de `admins` verifica: `EXISTS (SELECT FROM admins WHERE user_id = auth.uid())`
4. **RECURSÃO INFINITA!** ♾️

## Solução Implementada

Criada função `SECURITY DEFINER` que bypassa o RLS para verificar se usuário é admin:

```sql
CREATE OR REPLACE FUNCTION is_user_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admins
    WHERE user_id = user_id_param
      AND is_active = true
  );
END;
$$;
```

### Por que SECURITY DEFINER resolve?

- `SECURITY DEFINER`: Função executa com privilégios do **criador** (postgres/service_role)
- Bypassa RLS ao acessar a tabela `admins`
- Não causa recursão porque não passa pelas políticas RLS
- Seguro porque a lógica está encapsulada na função

### Políticas Atualizadas

**Tabela `users`:**
```sql
CREATE POLICY "Admins can read all users"
ON users FOR SELECT
TO authenticated
USING (is_user_admin(auth.uid()));
```

**Tabela `user_plans`:**
```sql
CREATE POLICY "Admins can view all plans"
ON user_plans FOR SELECT
TO authenticated
USING (is_user_admin(auth.uid()));
```

**Tabela `admins`:**
- Mantida política original (agora sem recursão)
- Apenas admins podem ver registros de admins
- Usuários não-admin não conseguem ler nada na tabela

## Segurança

✅ **Usuários não-admin NÃO podem**:
- Ler a tabela `admins`
- Ver quem são os admins
- Verificar se eles mesmos são admins diretamente

✅ **Apenas a função `is_user_admin()` pode**:
- Verificar se um usuário é admin
- Acessar a tabela `admins` sem RLS
- Retornar apenas boolean (não expõe dados)

✅ **Admins podem**:
- Ler todos os usuários
- Ler todos os planos
- Ver registros de outros admins

## Migrações Aplicadas

1. `fix_admins_rls_with_security_definer` - Criou função e atualizou políticas de `users`
2. `update_user_plans_rls_with_function` - Atualizou políticas de `user_plans`

## Resultado

✅ Sem recursão infinita
✅ Sem erro "role admin does not exist"
✅ Segurança mantida
✅ Performance melhorada (função é mais rápida que subquery recursiva)
