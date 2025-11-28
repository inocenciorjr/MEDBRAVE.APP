import { Router } from "express";
import { supabase } from "../../../config/supabaseAdmin";
import { supabaseAuthMiddleware } from "../../auth/middleware/supabaseAuth.middleware";
import { enhancedAuthMiddleware } from "../../auth/middleware/enhancedAuth.middleware";
import { selfMiddleware } from "../../auth/middleware/self.middleware";

export function createUserRoutes(): Router {
  const router = Router();

  console.log('🔧 [UserRoutes] Registrando rotas de usuário...');

  // Rota de teste sem middleware para verificar se a rota está sendo registrada
  router.get("/test", async (req, res) => {
    console.log('📍 [UserRoutes] GET /test chamado - rota funcionando!');
    return res.status(200).json({ message: "User routes working!" });
  });

  // Rota /me usa APENAS autenticação (sem verificação de plano)
  // Isso permite que o frontend busque a role antes de verificar o plano
  router.get("/me", supabaseAuthMiddleware, async (req, res) => {
    console.log('📍 [UserRoutes] GET /me chamado');
    console.log('📍 [UserRoutes] Headers:', req.headers.authorization ? 'Authorization presente' : 'Authorization ausente');
    console.log('📍 [UserRoutes] User:', (req as any).user);
    console.log('📍 [UserRoutes] UserId:', (req as any).userId);
    
    try {
      // Tentar pegar userId de diferentes lugares onde o middleware pode ter colocado
      const userId = (req as any).userId || (req as any).user?.id;

      console.log('📍 [UserRoutes] UserId final:', userId);

      if (!userId) {
        console.log('❌ [UserRoutes] UserId não encontrado - retornando 401');
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !userData) {
        return res.status(404).json({ error: "User not found" });
      }

      // Buscar plano ativo do usuário
      let activePlan = null;
      const { data: userPlans, error: planError } = await supabase
        .from("user_plans")
        .select(`
          id,
          plan_id,
          status,
          start_date,
          end_date,
          plans (
            id,
            name
          )
        `)
        .eq("user_id", userId)
        .ilike("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!planError && userPlans && userPlans.length > 0) {
        const plan = userPlans[0];
        activePlan = {
          id: plan.id,
          planId: plan.plan_id,
          planName: (plan.plans as any)?.name || 'Plano Desconhecido',
          status: plan.status,
          startDate: plan.start_date,
          endDate: plan.end_date,
          isTrial: (plan.plans as any)?.name?.includes('TRIAL') || false,
        };
      }

      // Formatar resposta no formato esperado pelo frontend
      const formattedUser = {
        id: userData.id,
        email: userData.email,
        role: userData.role || "STUDENT",
        displayName: userData.display_name || userData.displayName || userData.email || "Usuário sem nome",
        photoURL: userData.photo_url || userData.photoURL || null,
        activePlan,
      };

      return res.status(200).json(formattedUser);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Aplicar middleware de autenticação + plano nas demais rotas
  router.use(enhancedAuthMiddleware);

  // Rota para atualizar o perfil do usuário
  router.put("/me", selfMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Impede alteração da role pelo próprio usuário
      if ("role" in req.body) {
        return res
          .status(403)
          .json({ error: "Você não pode alterar sua própria role." });
      }

      const updateData = {
        ...req.body,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedData, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Erro ao atualizar usuário" });
      }

      return res.status(200).json({
        message: "Perfil atualizado com sucesso",
        user: updatedData,
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Rota para deletar o próprio usuário (se existir)
  router.delete("/me", selfMiddleware, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { error } = await supabase
        .from("users")
        .update({
          deleted_at: new Date().toISOString(),
          status: "DELETED",
        })
        .eq("id", userId);

      if (error) {
        return res.status(500).json({ error: "Erro ao deletar usuário" });
      }

      return res
        .status(200)
        .json({ message: "Conta deletada com sucesso", id: userId });
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Rota para obter todos os usuários (apenas para admin)
  router.get("/", async (req, res) => {
    try {
      console.log("👤 User objeto completo:", req.user);
      console.log("👤 User role:", req.user?.user_role);
      console.log("👤 User id:", req.user?.id);

      if ((req.user?.user_role || '').toUpperCase() !== "ADMIN") {
        console.log("❌ Acesso negado - usuário não é admin");
        return res.status(403).json({ error: "Forbidden" });
      }

      // Admin user - fetching users from Supabase
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) {
        console.error("Erro ao buscar usuários:", error);
        return res.status(500).json({ error: "Erro ao buscar usuários" });
      }

      console.log(`📊 Total de usuários encontrados: ${users?.length || 0}`);

      // Para manter compatibilidade, vamos obter a role real do raw_user_meta_data
      // quando possível, mas usar a role da tabela users como fallback
      const formattedUsers =
        users
          ?.filter((userData) => {
            // Filtrar usuários deletados
            if (userData.deleted_at) {
              console.log(
                `⚠️ Usuário ${userData.id} está deletado, pulando...`,
              );
              return false;
            }
            return true;
          })
          .map((userData) => {
            console.log(
              `📄 Processando usuário: ${userData.id}`,
              userData.email,
            );

            return {
              id: userData.id,
              displayName:
                userData.displayName ||
                userData.email ||
                "Usuário sem nome",
              email: userData.email,
              role: userData.role || "STUDENT",
              status: userData.status || "ACTIVE",
              emailVerified: userData.emailVerified || false,
              phoneNumber: userData.phoneNumber || null,
              photoURL: userData.photoURL || null,
              biography: userData.biography || null,
              createdAt: userData.createdAt || new Date().toISOString(),
              updatedAt: userData.updatedAt || new Date().toISOString(),
              lastLoginAt: userData.lastLogin || null,
              stats: userData.stats || {
                questionsAnswered: 0,
                questionsCorrect: 0,
                questionsFlagged: 0,
                flashcardsReviewed: 0,
                flashcardsMastered: 0,
                errorsRegistered: 0,
                simulatedTestsCompleted: 0,
                studyTime: 0,
                lastStudySession: null,
                streak: 0,
                maxStreak: 0,
                pointsTotal: 0,
                level: 1,
              },
            };
          }) || [];

      console.log(`✅ Retornando ${formattedUsers.length} usuários válidos`);
      console.log('📄 JSON Response:', JSON.stringify(formattedUsers, null, 2));

      return res.status(200).json(formattedUsers);
    } catch (error) {
      console.error("❌ Erro ao buscar usuários:", error);
      return res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Rota para obter um usuário específico por ID
  router.get("/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const requestingUser = req.user;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Se não for admin, só pode ver seu próprio perfil
      if ((requestingUser?.user_role || '').toUpperCase() !== "ADMIN" && requestingUser?.id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !userData) {
        return res.status(404).json({ error: "User not found" });
      }

      // Se o usuário estiver deletado, não retornar
      if (userData.deleted_at) {
        return res.status(404).json({ error: "User not found" });
      }

      const formattedUser = {
        id: userData.id,
        displayName: userData.displayName || userData.email || "Usuário sem nome",
        email: userData.email,
        role: req.user?.id === userId ? (req.user?.user_role || userData.role || "STUDENT") : (userData.role || "STUDENT"),
        status: userData.status || "ACTIVE",
        emailVerified: userData.emailVerified || false,
        phoneNumber: userData.phoneNumber || null,
        photoURL: userData.photoURL || null,
        biography: userData.biography || null,
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString(),
        lastLoginAt: userData.lastLogin || null,
        stats: userData.stats || {
          questionsAnswered: 0,
          questionsCorrect: 0,
          questionsFlagged: 0,
          flashcardsReviewed: 0,
          flashcardsMastered: 0,
          errorsRegistered: 0,
          simulatedTestsCompleted: 0,
          studyTime: 0,
          lastStudySession: null,
          streak: 0,
          maxStreak: 0,
          pointsTotal: 0,
          level: 1,
        },
      };

      return res.status(200).json(formattedUser);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- NOTIFICAÇÕES E CONTATO ---

  // GET /user/notification-preferences
  router.get("/notification-preferences", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { data, error } = await supabase
        .from('users')
        .select('notificationPreferences')
        .eq('id', userId)
        .single();

      if (error) {
        return res.status(500).json({ error: 'Erro ao buscar preferências' });
      }

      if (!data) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ preferences: data.notificationPreferences || [] });
    } catch (error) {
      console.error("Erro ao buscar notification-preferences:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /user/notification-preferences
  router.put("/notification-preferences", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { type, ...rest } = req.body;
      if (!type) {
        return res
          .status(400)
          .json({ error: 'Tipo de preferência não informado' });
      }
      const { data: current, error: fetchError } = await supabase
        .from('users')
        .select('notificationPreferences')
        .eq('id', userId)
        .single();

      if (fetchError) {
        return res.status(500).json({ error: 'Erro ao buscar preferências' });
      }

      const prefs = (current?.notificationPreferences || []) as any[];
      const idx = prefs.findIndex((p: any) => p.type === type);
      if (idx >= 0) {
        prefs[idx] = { ...prefs[idx], ...rest, type };
      } else {
        prefs.push({ ...rest, type });
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ notificationPreferences: prefs, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        return res.status(500).json({ error: 'Erro ao atualizar preferências' });
      }

      return res.status(200).json({ preference: prefs.find((p: any) => p.type === type) });
    } catch (error) {
      console.error("Erro ao atualizar notification-preferences:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /user/contact-info
  router.get("/contact-info", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { data, error } = await supabase
        .from('users')
        .select('contactInfo')
        .eq('id', userId)
        .single();

      if (error) {
        return res.status(500).json({ error: 'Erro ao buscar contato' });
      }
      if (!data) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ contactInfo: (data as any).contactInfo || null });
    } catch (error) {
      console.error("Erro ao buscar contact-info:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT /user/contact-info
  router.put("/contact-info", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { error } = await supabase
        .from('users')
        .update({ contactInfo: req.body, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        return res.status(500).json({ error: 'Erro ao atualizar contato' });
      }
      return res.status(200).json({ contactInfo: req.body });
    } catch (error) {
      console.error("Erro ao atualizar contact-info:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /user/notification-stats
  router.get("/notification-stats", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { data, error } = await supabase
        .from('users')
        .select('notificationStats, recentDeliveries')
        .eq('id', userId)
        .single();

      if (error) {
        return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
      }
      if (!data) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        stats: (data as any).notificationStats || null,
        recentDeliveries: (data as any).recentDeliveries || [],
      });
    } catch (error) {
      console.error("Erro ao buscar notification-stats:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
