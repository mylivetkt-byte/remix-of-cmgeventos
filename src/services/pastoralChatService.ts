import { supabase } from "@/integrations/supabase/client";

export interface PastoralMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  audio_url?: string | null;
  intent?: string;
  created_at: string;
}

export interface SpiritualMemory {
  id: string;
  memory_type: "prayer_request" | "family_need" | "decision_christ" | "emotional_state" | "interested_event" | "pastoral_note";
  detail: string;
  created_at: string;
}

export interface PastoralSession {
  id: string;
  session_token: string;
  user_name: string | null;
  summary: string | null;
  created_at: string;
}

const STORAGE_KEY = "pastoral_agent_session_token_v1";
const ADVISOR_NAME = "Bernabé";

export class PastoralChatService {
  /**
   * Obtiene o genera el token único de sesión del dispositivo
   */
  public static getSessionToken(): string {
    let token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      token = "pastor_sess_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY, token);
    }
    return token;
  }

  /**
   * Obtiene o crea la sesión en Supabase
   */
  public static async getOrCreateSession(): Promise<PastoralSession> {
    const sessionToken = this.getSessionToken();

    try {
      // 1. Intentar buscar sesión existente
      const { data: existing, error: searchError } = await supabase
        .from("pastoral_chat_sessions" as any)
        .select("*")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (searchError) {
        console.warn("Aviso al consultar sesión en Supabase (puede requerir migración):", searchError.message);
      }

      if (existing) {
        return existing as unknown as PastoralSession;
      }

      // 2. Crear nueva sesión si no existe
      const newSession = {
        session_token: sessionToken,
        user_name: null,
        summary: "Inicio de conversación pastoral y espiritual.",
      };

      const { data: created, error: insertError } = await supabase
        .from("pastoral_chat_sessions" as any)
        .insert(newSession)
        .select()
        .single();

      if (insertError || !created) {
        // Fallback local si la tabla aún no existe en Supabase
        return {
          id: sessionToken,
          session_token: sessionToken,
          user_name: localStorage.getItem("pastoral_user_name") || null,
          summary: "Sesión activa local",
          created_at: new Date().toISOString(),
        };
      }

      return created as unknown as PastoralSession;
    } catch (e) {
      console.warn("Fallback de sesión local:", e);
      return {
        id: sessionToken,
        session_token: sessionToken,
        user_name: localStorage.getItem("pastoral_user_name") || null,
        summary: "Sesión activa local",
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Actualiza el nombre del usuario detectado
   */
  public static async updateUserName(sessionId: string, name: string): Promise<void> {
    localStorage.setItem("pastoral_user_name", name);
    try {
      await supabase
        .from("pastoral_chat_sessions" as any)
        .update({ user_name: name, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    } catch {
      // Continuar con memoria local
    }
  }

  /**
   * Carga los mensajes del historial
   */
  public static async loadMessages(sessionId: string): Promise<PastoralMessage[]> {
    try {
      const { data, error } = await supabase
        .from("pastoral_chat_messages" as any)
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error || !data || data.length === 0) {
        // Buscar en localStorage como fallback
        const local = localStorage.getItem(`pastoral_msgs_${sessionId}`);
        if (local) {
          try {
            return JSON.parse(local);
          } catch {
            return [];
          }
        }
        return [];
      }

      return data as unknown as PastoralMessage[];
    } catch {
      const local = localStorage.getItem(`pastoral_msgs_${sessionId}`);
      return local ? JSON.parse(local) : [];
    }
  }

  /**
   * Guarda un mensaje en el historial y en localStorage
   */
  public static async saveMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    intent: string = "general",
    audioUrl?: string | null
  ): Promise<PastoralMessage> {
    const newMsg: PastoralMessage = {
      id: "msg_" + Math.random().toString(36).substring(2) + Date.now(),
      role,
      content,
      intent,
      audio_url: audioUrl,
      created_at: new Date().toISOString(),
    };

    // 1. Guardar en local storage para resiliencia inmediata
    try {
      const local = localStorage.getItem(`pastoral_msgs_${sessionId}`);
      const list: PastoralMessage[] = local ? JSON.parse(local) : [];
      list.push(newMsg);
      localStorage.setItem(`pastoral_msgs_${sessionId}`, JSON.stringify(list));
    } catch (e) {
      console.warn("No se pudo guardar mensaje en local:", e);
    }

    // 2. Guardar en Supabase si la tabla está lista
    try {
      await supabase.from("pastoral_chat_messages" as any).insert({
        session_id: sessionId,
        role,
        content,
        intent,
        audio_url: audioUrl,
      });
    } catch (e) {
      console.warn("Aviso al guardar en Supabase:", e);
    }

    return newMsg;
  }

  /**
   * Guarda una memoria espiritual en el cerebro de la base de datos
   */
  public static async addSpiritualMemory(
    sessionId: string,
    type: SpiritualMemory["memory_type"],
    detail: string
  ): Promise<void> {
    try {
      await supabase.from("pastoral_spiritual_memory" as any).insert({
        session_id: sessionId,
        memory_type: type,
        detail,
        is_active: true,
      });
    } catch {
      // Guardar en local
      const key = `pastoral_memories_${sessionId}`;
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.push({ type, detail, date: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
    }
  }

  /**
   * Carga las memorias activas del cerebro
   */
  public static async loadSpiritualMemories(sessionId: string): Promise<SpiritualMemory[]> {
    try {
      const { data } = await supabase
        .from("pastoral_spiritual_memory" as any)
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) return data as unknown as SpiritualMemory[];
    } catch {
      // Ignorar
    }
    const key = `pastoral_memories_${sessionId}`;
    return JSON.parse(localStorage.getItem(key) || "[]");
  }

  /**
   * Detecta si el mensaje contiene el nombre de la persona
   */
  public static extractUserName(text: string): string | null {
    const patterns = [
      /me llamo\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]{2,20})/i,
      /mi nombre es\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]{2,20})/i,
      /soy\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]{2,20})/i,
      /puedes decirme\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]{2,20})/i,
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match && match[1]) {
        // Filtrar palabras comunes que no son nombres
        const word = match[1].trim();
        const nonNames = ["cristiano", "pecador", "nuevo", "de", "un", "una", "alguien", "aqui", "a", "el", "la"];
        if (!nonNames.includes(word.toLowerCase())) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
      }
    }
    return null;
  }

  /**
   * Obtiene eventos activos de la congregación para recomendarlos
   */
  public static async getActiveEvents(): Promise<any[]> {
    try {
      const { data } = await supabase
        .from("events")
        .select("id, slug, nombre, descripcion, fecha_evento, lugar_evento, precio, cupos")
        .eq("activo", true)
        .order("fecha_evento", { ascending: true })
        .limit(5);

      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Genera la respuesta del Pastor con teología de rescate, amor y eventos
   */
  public static async generatePastorResponse(
    sessionId: string,
    userText: string,
    history: PastoralMessage[],
    currentUserName: string | null
  ): Promise<{ text: string; intent: string }> {
    const lower = userText.toLowerCase();

    // 1. Detectar si el usuario compartió su nombre
    const detectedName = this.extractUserName(userText);
    const activeName = detectedName || currentUserName || "";
    if (detectedName && detectedName !== currentUserName) {
      await this.updateUserName(sessionId, detectedName);
    }

    const greeting = activeName ? `amado/a ${activeName}` : "mi querido hermano/a";

    // 2. Detectar intenciones clave
    const isCrisis = /suicid|morir|no quiero vivir|acabar con mi vida|quitarme la vida|desesperad/i.test(lower);
    const isSalvation = /salvaci|salvar|aceptar a cristo|conocer a jes[uú]s|arrepent|perd[oó]n de dios|vida eterna|c[oó]mo ser salvo/i.test(lower);
    const isPrayer = /oraci|orar|ora por|enfermo|sanidad|interced|pide por|clama|enfermedad|dolor/i.test(lower);
    const isEvents = /evento|retiro|congreso|conferencia|actividad|cuando es|fecha|horario|inscripci|costo/i.test(lower);
    const isFamilyOrMarriage = /espos[oa]|matrimonio|pareja|hijo|familia|divorcio|hogar|novi/i.test(lower);
    const isAnxietyOrSadness = /ansiedad|triste|depresi|deprimid|angustia|soledad|miedo|des[aá]nimo|llor/i.test(lower);

    // --- A. PROTOCOLO DE RESCATE EN CRISIS EXTREMA ---
    if (isCrisis) {
      await this.addSpiritualMemory(sessionId, "emotional_state", "Alerta de crisis emocional profunda");
      return {
        intent: "crisis",
        text: `🕊️ **${activeName ? activeName.toUpperCase() + ", " : ""}POR FAVOR ESCÚCHAME CON TODO EL CORAZÓN:**

Tu vida tiene un valor incalculable para Dios. En este mismo instante, aunque el dolor parezca insoportable, **NO ESTÁS SOLO/A**. La Biblia nos promete en *Salmos 34:18*: 
> *"Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu."*

El enemigo quiere hacerte creer que este es el final, pero Dios aún tiene planes de bienestar, paz y esperanza para ti (Jeremías 29:11). Te ruego que no tomes ninguna decisión fatal. 

🙏 **Oremos ahora mismo:**
*Padre Celestial, en el nombre de Jesús, abrazo a ${greeting} en este momento de angustia extrema. Te pido que envíes a tus ángeles y a tu Santo Espíritu trayendo paz que sobrepasa todo entendimiento. Rompe toda tiniebla de desesperación, reprende el espíritu de muerte y llena este corazón con tu amor infinito. En el nombre de Jesús, amén.*

Por favor, comunícate de inmediato con una línea de ayuda de tu país o acércate a los líderes de nuestra iglesia. Estamos aquí para ti con los brazos abiertos. ¿Puedes contarme qué es lo que más te aflige en este instante? Te escucho con amor.

*Con aprecio sincero y oración,  
**${ADVISOR_NAME}** - Tu consejero y amigo.*`,
      };
    }

    // --- B. RESCATE DE ALMAS / SALVACIÓN Y CONOCER A JESÚS ---
    if (isSalvation) {
      await this.addSpiritualMemory(sessionId, "decision_christ", "Interés o decisión de entrega a Cristo");
      return {
        intent: "salvacion",
        text: `✨ **¡Qué bendición tan hermosa leer tus palabras, ${greeting}!**

No hay decisión más trascendental ni gloriosa en toda la existencia humana que abrirle las puertas del corazón a Jesús. La Palabra de Dios nos enseña en *Juan 3:16*:
> *"Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna."*

Jesús no vino a condenarte ni a pedirte perfección; vino a rescatarte con sus brazos de gracia, perdonar cada una de tus faltas y hacerte una nueva criatura (*2 Corintios 5:17*).

Si deseas entregarle hoy tu vida, repite con fe desde lo profundo de tu corazón esta sencilla oración:

> *"Señor Jesús, hoy reconozco que te necesito. Reconozco que he cometido errores y te pido perdón por mis pecados. Creo con todo mi corazón que moriste en la cruz por mí y que resucitaste al tercer día para darme vida eterna. Te abro mi corazón y te recibo hoy como mi único y suficiente Salvador y Señor de mi vida. Escribe mi nombre en el Libro de la Vida y lléname de tu Santo Espíritu. En el nombre de Jesús, ¡Amén!"*

Si hiciste esta oración, ¡hoy hay fiesta en los cielos por tu alma! Cuéntame, ¿cómo te sientes ahora mismo? Me encantaría acompañarte y guiarte en tus primeros pasos de fe.

*Siempre a tu lado en oración,  
**${ADVISOR_NAME}*** 🕊️`,
      };
    }

    // --- C. INFORMACIÓN DE EVENTOS REALES DE LA IGLESIA ---
    if (isEvents) {
      const events = await this.getActiveEvents();
      let eventDetails = "";

      if (events.length > 0) {
        eventDetails = events
          .map((evt) => {
            const fecha = evt.fecha_evento ? new Date(evt.fecha_evento).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) : "Fecha por confirmar";
            const lugar = evt.lugar_evento || "Sede Principal Centro Mundial de Gloria";
            return `📅 **${evt.nombre}**\n- 🗓️ **Fecha:** ${fecha}\n- 📍 **Lugar:** ${lugar}\n- 🎟️ **Inscripción:** [Registrarme aquí](/eventos/${evt.slug})\n_${evt.descripcion || "Un tiempo poderoso en la presencia de Dios."}_`;
          })
          .join("\n\n");
      } else {
        eventDetails = "Estamos preparando nuestros próximos eventos y conferencias especiales. Puedes revisar periódicamente nuestra cartelera principal o avisarme qué tipo de actividad buscas (jóvenes, damas, matrimonios o retiros).";
      }

      await this.addSpiritualMemory(sessionId, "interested_event", "Consulta sobre eventos de la iglesia");

      return {
        intent: "evento",
        text: `¡Qué gran alegría, ${greeting}! La comunión con los hermanos y congregarse es alimento vital para el alma (*Hebreos 10:25*).

Aquí tienes información de nuestras próximas actividades y encuentros:

${eventDetails}

¿Te llama la atención alguno de estos eventos? Puedo ayudarte con cualquier inquietud sobre la inscripción o la llegada. ¡Será un privilegio inmenso verte allí adorando juntos a Dios!

*Bendiciones abundantes,  
**${ADVISOR_NAME}*** ⛪`,
      };
    }

    // --- D. PETICIONES DE ORACIÓN & INTERCESIÓN ---
    if (isPrayer) {
      await this.addSpiritualMemory(sessionId, "prayer_request", userText.slice(0, 150));
      return {
        intent: "oracion",
        text: `🙏 **Amado/a ${activeName || "hermano/a"}, unámonos en clamor ante el trono de la gracia:**

Jesús nos dio esta promesa infalible en *Mateo 18:19*:
> *"Otra vez os digo, que si dos de vosotros se pusieren de acuerdo en la tierra acerca de cualquiera cosa que pidieren, les será hecho por mi Padre que está en los cielos."*

Clamemos juntos en este momento:

🕊️ **Oración:**
*Padre Bueno, Dios de toda consolación y Señor de la vida, hoy me pongo en mutuo acuerdo con ${activeName || "esta vida preciosa"}. Ponemos delante de Tu altar esta necesidad, el dolor, la salud y cada anhelo de su corazón. Declaramos que por las llagas de Cristo hay sanidad física, emocional y espiritual.*

*Envía Tu paz sobrenatural que disipa todo temor y angustia. Suple cada necesidad según tus riquezas en gloria. Que esta semana sea testigo de Tu mano milagrosa y de Tu provisión. Te damos toda la gloria, honra y alabanza, en el nombre poderoso de Cristo Jesús, ¡AMÉN!*

Descansa en sus promesas hoy. Si hay algún detalle específico que quieras que continúe intercediendo en mi altar de oración, compártemelo con total confianza.

*Firmes en la fe,  
**${ADVISOR_NAME}*** 🕊️`,
      };
    }

    // --- E. CONSEJERÍA DE MATRIMONIO Y FAMILIA ---
    if (isFamilyOrMarriage) {
      await this.addSpiritualMemory(sessionId, "family_need", "Consejería familiar / matrimonio");
      return {
        intent: "consejeria",
        text: `🤍 **Querido/a ${activeName || "hermano/a"}, la familia es el tesoro más amado por Dios:**

En los momentos de dificultad en el hogar o la pareja, la Palabra nos recuerda en *Efesios 4:2-3*:
> *"Con toda humildad y mansedumbre, soportándoos con paciencia los unos a los otros en amor, solícitos en guardar la unidad del Espíritu en el vínculo de la paz."*

Recuerda que las batallas en el hogar no se ganan con contiendas ni con dureza de palabras, sino doblando rodillas y aplicando perdón diario (*Colosenses 3:13*). El amor de Cristo es capaz de restaurar vasijas rotas y devolver la armonía donde parecía imposible.

¿Te gustaría que oremos juntos por la restauración y unidad de tu hogar en este instante? Cuéntame un poco más para bendecirte con dirección espiritual.

*Con afecto fraternal,  
**${ADVISOR_NAME}*** 🌿`,
      };
    }

    // --- F. CONSEJERÍA PARA ANSIEDAD, TRISTEZA O DESÁNIMO ---
    if (isAnxietyOrSadness) {
      await this.addSpiritualMemory(sessionId, "emotional_state", "Desahogo por tristeza o ansiedad");
      return {
        intent: "consejeria",
        text: `🕊️ **Respira profundo, ${greeting}. Pon tu mano en el corazón un momento.**

No te sientas culpable por sentir tristeza o cansancio. Los más grandes hombres y mujeres de la Biblia también lloraron y se sintieron débiles. Pero mira la dulce promesa que Dios te entrega hoy en *Filipenses 4:6-7*:
> *"Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias. Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús."*

Dios no te ha abandonado ni un solo segundo. Esta prueba no define tu futuro; es solo una estación donde Dios está fortaleciendo tus raíces.

Te invito a soltar esa carga pesada hoy en Sus manos. ¿Qué es lo que más te pesa hoy en tu mente? Aquí estoy para escucharte con amor cristiano y sin juzgarte jamás.

*Tu servidor en Cristo,  
**${ADVISOR_NAME}*** 🕯️`,
      };
    }

    // --- G. SALUDO INICIAL Y CONVERSACIÓN GENERAL ---
    return {
      intent: "general",
      text: `🕊️ **La gracia y la paz de nuestro Señor Jesucristo sean contigo, ${greeting}.**

Soy **${ADVISOR_NAME}**, tu consejero espiritual y hermano en la fe en este espacio confidencial.

Estoy aquí para caminar contigo en:
- 🙏 **Oración e Intercesión**: Si necesitas clamar por sanidad, paz o tu familia.
- 🕊️ **Consejería Bíblica**: Para cualquier duda, momento difícil o búsqueda de dirección de Dios.
- ❤️ **Conocer a Jesús**: El regalo de salvación y una vida nueva en Cristo.
- 📅 **Eventos y Retiros**: Para que conozcas y participes de nuestras próximas reuniones.

¿Cómo te sientes hoy y en qué puedo orar o apoyarte en este momento?

*En el amor de Cristo,  
**${ADVISOR_NAME}*** ✨`,
    };
  }
}
