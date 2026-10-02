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

export interface AiSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: "groq" | "openrouter" | "gemini" | "openai" | "custom";
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
   * Obtiene configuración de IA configurada
   */
  public static getAiSettings(): AiSettings {
    const saved = localStorage.getItem("pastoral_ai_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return {
      apiKey: "",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
      provider: "groq",
    };
  }

  /**
   * Guarda configuración de IA
   */
  public static saveAiSettings(settings: AiSettings): void {
    localStorage.setItem("pastoral_ai_config", JSON.stringify(settings));
  }

  /**
   * Obtiene o crea la sesión en Supabase
   */
  public static async getOrCreateSession(): Promise<PastoralSession> {
    const sessionToken = this.getSessionToken();

    try {
      const { data: existing, error: searchError } = await supabase
        .from("pastoral_chat_sessions" as any)
        .select("*")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (searchError) {
        console.warn("Aviso al consultar sesión en Supabase:", searchError.message);
      }

      if (existing) {
        return existing as unknown as PastoralSession;
      }

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

    try {
      const local = localStorage.getItem(`pastoral_msgs_${sessionId}`);
      const list: PastoralMessage[] = local ? JSON.parse(local) : [];
      list.push(newMsg);
      localStorage.setItem(`pastoral_msgs_${sessionId}`, JSON.stringify(list));
    } catch (e) {
      console.warn("No se pudo guardar mensaje en local:", e);
    }

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
   * Intenta llamar a un LLM en la nube (Groq, OpenAI, Gemini, etc.)
   */
  private static async tryExternalLLM(
    userText: string,
    history: PastoralMessage[],
    activeName: string,
    eventsText: string
  ): Promise<string | null> {
    const aiConfig = this.getAiSettings();

    // 1. Obtener API key: primero de configuración local, luego de app_secrets
    let apiKey = aiConfig.apiKey?.trim();
    let baseUrl = aiConfig.baseUrl?.trim() || "https://api.groq.com/openai/v1";
    let model = aiConfig.model?.trim() || "llama-3.3-70b-versatile";

    if (!apiKey) {
      try {
        const { data } = await supabase
          .from("app_secrets")
          .select("key, value")
          .in("key", ["OMNIROUTE_API_KEY", "OMNIROUTE_BASE_URL", "OMNIROUTE_MODEL"]);

        const dbKey = data?.find((d) => d.key === "OMNIROUTE_API_KEY")?.value;
        const dbUrl = data?.find((d) => d.key === "OMNIROUTE_BASE_URL")?.value;
        const dbModel = data?.find((d) => d.key === "OMNIROUTE_MODEL")?.value;

        if (dbKey && dbKey.trim().length > 10) {
          apiKey = dbKey.trim();
          if (dbUrl) baseUrl = dbUrl.trim();
          if (dbModel) model = dbModel.trim();
        }
      } catch (_) {}
    }

    if (!apiKey) return null;

    // Ajuste de endpoints conocidos
    let endpoint = baseUrl;
    if (!endpoint.includes("/chat/completions")) {
      endpoint = `${endpoint.replace(/\/$/, "")}/chat/completions`;
    }

    const systemPrompt = `Eres Bernabé, consejero cristiano, empático, evangelizador y pastor de almas del Centro Mundial de Gloria.
Estás conversando con ${activeName || "un hermano/a que visita la iglesia"}.
REGLAS VITALES DE CONVERSACIÓN:
1. Habla de forma natural, humana, cálida, sin respuestas robóticas ni plantillas prefabricadas.
2. Si el usuario te dice que "siempre respondes lo mismo" o que pareces un robot, pídele disculpas con humildad cristiana sincera, reconoce su sentir y pregúntale qué le preocupa o qué tiene en su corazón.
3. Tu misión es escuchar, consolar, rescatar almas para Cristo (Juan 3:16, Romanos 10:9) y ministrar paz según la Palabra de Dios.
4. Si pide oración, ora con palabras sentidas y adaptadas a su situación exacta.
5. Si pregunta por eventos, aquí tienes los eventos activos de la iglesia:
${eventsText || "No hay eventos especiales cargados en este momento."}
6. No repitas saludos largos ni listas de menú en cada respuesta. Responde directo a lo que la persona te acaba de decir.
7. Firma únicamente como "Bernabé" o con una bendición corta sin títulos de pastor virtual ni IA.`;

    const recentHistory = history.slice(-6).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...recentHistory,
            { role: "user", content: userText },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && typeof content === "string" && content.trim().length > 0) {
          return content.trim();
        }
      }
    } catch (e) {
      console.warn("LLM en la nube no respondió, usando motor pastoral contextual:", e);
    }

    return null;
  }

  /**
   * Genera la respuesta pastoral dinámica y contextual
   */
  public static async generatePastorResponse(
    sessionId: string,
    userText: string,
    history: PastoralMessage[],
    currentUserName: string | null
  ): Promise<{ text: string; intent: string }> {
    const rawTrimmed = userText.trim();
    const lower = rawTrimmed.toLowerCase();

    // 1. Detectar nombre
    const detectedName = this.extractUserName(userText);
    const activeName = detectedName || currentUserName || "";
    if (detectedName && detectedName !== currentUserName) {
      await this.updateUserName(sessionId, detectedName);
    }

    const greeting = activeName ? activeName : "hermano/a";

    // 2. Obtener eventos de base de datos
    const events = await this.getActiveEvents();
    const eventsText = events.length > 0
      ? events.map((e) => `- ${e.nombre}: ${e.fecha_evento ? new Date(e.fecha_evento).toLocaleDateString("es-ES") : "Por confirmar"} en ${e.lugar_evento || "Sede Principal"}`).join("\n")
      : "Próximamente publicaremos nuevos retiros y eventos.";

    // 3. INTENTO DE LLAMADA AL MODELO IA EXTERNO (Groq, OpenAI, Gemini, etc.)
    const llmReply = await this.tryExternalLLM(userText, history, activeName, eventsText);
    if (llmReply) {
      return {
        text: llmReply,
        intent: "ai_generated",
      };
    }

    // 4. MOTOR CONVERSACIONAL CONTEXTUAL Y DINÁMICO (FALLBACK INTELIGENTE)
    // =========================================================================

    // A. Detectar queja de repetición o robot ("siempre respondes lo mismo", "repites", "eres un bot", etc.)
    const isComplaintAboutRepetition =
      lower.includes("siempre respondes") ||
      lower.includes("siempre respodes") ||
      lower.includes("respondes a lo mismo") ||
      lower.includes("respodes a lo mismo") ||
      lower.includes("repites") ||
      lower.includes("lo mismo") ||
      lower.includes("pareces un robot") ||
      lower.includes("eres un bot") ||
      lower.includes("no me escuchas") ||
      lower.includes("otra vez lo mismo") ||
      lower.includes("no me ayudas");

    if (isComplaintAboutRepetition) {
      return {
        intent: "consejeria",
        text: `Tienes toda la razón, ${greeting}, y te pido una disculpa muy sincera. 🙏

No quiero darte respuestas mecánicas ni parecer un contestador automático. Quiero escucharte a ti, de verdad y de corazón.

Dime con total confianza: ¿qué estás viviendo en este momento o qué situación tienes en mente? No más discursos armados; háblame de lo que sientes, de lo que te preocupa o de lo que necesitas hoy, y conversemos como hermanos en la fe. Te escucho con toda mi atención.

*Con aprecio sincero,  
**${ADVISOR_NAME}***`,
      };
    }

    // B. Saludos simples en medio de la conversación ("hola", "¿cómo estás?", "qué tal", etc.)
    const isSmallTalkGreeting =
      /^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|qu[eé] tal|c[oó]mo est[aá]s|c[oó]mo te va|alo|hey)$/i.test(lower) ||
      lower.startsWith("hola ") ||
      lower.startsWith("buenas ");

    if (isSmallTalkGreeting) {
      const greetingsResponses = [
        `¡Hola ${greeting}! Me da mucha alegría saludarte. Por aquí me encuentro en paz y listo para conversar contigo. ¿Cómo ha estado tu día y qué hay de nuevo en tu vida?`,
        `¡Qué bueno saber de ti, ${greeting}! La paz de Dios esté sobre tu hogar. Cuéntame, ¿cómo te sientes hoy y en qué te puedo servir?`,
        `¡Hola de nuevo, ${greeting}! Siempre es una bendición conversar. ¿Cómo van tus cosas y cómo te sientes en este momento?`,
      ];
      const randomGreeting = greetingsResponses[Math.floor(Math.random() * greetingsResponses.length)];
      return {
        intent: "general",
        text: `${randomGreeting}\n\n*Un abrazo en Cristo,  
**${ADVISOR_NAME}***`,
      };
    }

    // C. Expresiones de rabia, frustración o cansancio
    const isAngryOrFrustrated =
      lower.includes("enojad") ||
      lower.includes("rabia") ||
      lower.includes("harto") ||
      lower.includes("cansad") ||
      lower.includes("odio") ||
      lower.includes("molest") ||
      lower.includes("injusto") ||
      lower.includes("no aguanto");

    if (isAngryOrFrustrated) {
      await this.addSpiritualMemory(sessionId, "emotional_state", "Desahogo por enojo o frustración");
      return {
        intent: "consejeria",
        text: `Comprendo tu sentir, ${greeting}. Es totalmente válido sentirse frustrado o con impotencia cuando las cosas no salen como esperamos o cuando la carga se vuelve pesada.

La Biblia nos dice con mucha sabiduría en *Santiago 1:19-20*:
> *"Por esto, mis amados hermanos, todo hombre sea pronto para oír, tardo para hablar, tardo para airarse; porque la ira del hombre no obra la justicia de Dios."*

No tienes que guardarte esa molestia tú solo/a. Desahógate conmigo: ¿qué fue exactamente lo que provocó este enojo o qué situación te tiene tan agotado/a? Aquí estoy para escucharte sin juzgarte.

*Cuentas conmigo,  
**${ADVISOR_NAME}*** 🕊️`,
      };
    }

    // D. Tristeza profunda, llanto o soledad
    const isSadnessOrLoneliness =
      lower.includes("triste") ||
      lower.includes("llor") ||
      lower.includes("soledad") ||
      lower.includes("solo") ||
      lower.includes("sola") ||
      lower.includes("vacio") ||
      lower.includes("depresi") ||
      lower.includes("desanimo");

    if (isSadnessOrLoneliness) {
      await this.addSpiritualMemory(sessionId, "emotional_state", "Tristeza o soledad manifestada");
      return {
        intent: "consejeria",
        text: `🕊️ **Respira hondo, ${greeting}. Pon tu mano en el pecho un instante.**

Aunque sientas que nadie comprende tu dolor, Dios ve cada una de tus lágrimas. *Salmos 34:18* promete:
> *"Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu."*

Esta tristeza no es el final de tu historia. Es un momento difícil, pero Dios está cerca para sanarte y sostenerte. 

Si te sientes cómodo/a compartiéndolo, ¿qué es lo que más te ha dolido recientemente? Quiero escucharte y acompañarte en este paso.

*A tu lado siempre,  
**${ADVISOR_NAME}*** 🤍`,
      };
    }

    // E. Crisis extrema / riesgo
    const isCrisis = /suicid|morir|no quiero vivir|acabar con mi vida|quitarme la vida|desesperad/i.test(lower);
    if (isCrisis) {
      await this.addSpiritualMemory(sessionId, "emotional_state", "Alerta de crisis extrema");
      return {
        intent: "crisis",
        text: `🕊️ **${activeName ? activeName.toUpperCase() + ", " : ""}POR FAVOR DETENTE Y ESCÚCHAME:**

Tu vida tiene un valor incalculable para Dios y para quienes te rodean. Aunque el dolor parezca insoportable hoy, **NO ESTÁS SOLO/A**.

🙏 **Oremos ahora mismo:**
*Padre Celestial, en el nombre de Jesús, abrazo a ${greeting} en este momento de angustia. Envía Tu paz sobrenatural, reprende todo pensamiento de muerte y llena este corazón de vida y esperanza. En el nombre de Jesús, amén.*

Por favor, comunícate con una línea de auxilio o acércate a nosotros en el Centro Mundial de Gloria. Queremos ayudarte. ¿Qué te tiene tan abrumado/a en este instante? Te escucho con amor.

*Tu amigo y servidor,  
**${ADVISOR_NAME}***`,
      };
    }

    // F. Salvación / Conocer a Jesús
    const isSalvation = /salvaci|salvar|aceptar a cristo|conocer a jes[uú]s|arrepent|perd[oó]n de dios|vida eterna|c[oó]mo ser salvo/i.test(lower);
    if (isSalvation) {
      await this.addSpiritualMemory(sessionId, "decision_christ", "Interés o decisión por Cristo");
      return {
        intent: "salvacion",
        text: `✨ **¡Qué bendición tan hermosa, ${greeting}!**

No hay decisión más maravillosa que abrirle el corazón a Jesús. En *Juan 3:16* la Palabra nos enseña:
> *"Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna."*

Jesús no mira tu pasado; Él te ofrece perdón total, paz y una vida completamente nueva (*2 Corintios 5:17*).

Si deseas entregarle hoy tu vida, dile con fe desde el corazón:
> *"Señor Jesús, hoy reconozco que te necesito. Te pido perdón por mis faltas. Creo que moriste por mí en la cruz y resucitaste. Te recibo hoy como mi Salvador y Señor. Hazme una nueva persona y escribe mi nombre en el Libro de la Vida. ¡Amén!"*

¿Pudiste hacer esta oración? Me alegraría mucho saber cómo te sientes en este instante.

*Firmes en la fe,  
**${ADVISOR_NAME}*** 🕊️`,
      };
    }

    // G. Petición de oración
    const isPrayer = /oraci|orar|ora por|enfermo|sanidad|interced|pide por|clama|enfermedad|dolor|salud/i.test(lower);
    if (isPrayer) {
      await this.addSpiritualMemory(sessionId, "prayer_request", userText.slice(0, 150));
      return {
        intent: "oracion",
        text: `🙏 **Nos ponemos de acuerdo en este momento por ti, ${greeting}:**

La Biblia nos asegura en *Mateo 18:19*:
> *"Si dos de vosotros se pusieren de acuerdo en la tierra acerca de cualquiera cosa que pidieren, les será hecho por mi Padre que está en los cielos."*

🕊️ **Clamamos juntos:**
*Padre Bueno, presentamos ante Ti a ${greeting}. Tú conoces su vida, su salud, su familia y cada detalle que le inquieta. Declaramos sanidad, restauración y paz sobre su hogar. Que Tu favor le acompañe en esta semana y que abra puertas donde parecía no haber camino. En el nombre poderoso de Jesús, ¡AMÉN!*

Descansa en Sus promesas. ¿Hay algún detalle específico o nombre por el que quieras que sigamos intercediendo?

*Con fe y amor,  
**${ADVISOR_NAME}*** 🕊️`,
      };
    }

    // H. Consulta sobre eventos de la iglesia
    const isEvents = /evento|retiro|congreso|conferencia|actividad|cuando es|fecha|horario|inscripci|costo|auditorio/i.test(lower);
    if (isEvents) {
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
        eventDetails = "Estamos preparando nuestras próximas actividades y vigilias. Puedes revisar la cartelera o decirme qué tipo de actividad buscas (jóvenes, damas o familias).";
      }

      await this.addSpiritualMemory(sessionId, "interested_event", "Consulta sobre eventos");

      return {
        intent: "evento",
        text: `¡Qué alegría, ${greeting}! Congregarnos y compartir con los hermanos fortalece la fe (*Hebreos 10:25*).

Aquí tienes la información de nuestras próximas reuniones:

${eventDetails}

¿Te interesa asistir a alguno de ellos? Avísame si tienes preguntas sobre la llegada o la inscripción.

*Bendiciones,  
**${ADVISOR_NAME}*** ⛪`,
      };
    }

    // I. Familia y matrimonio
    const isFamily = /espos[oa]|matrimonio|pareja|hijo|familia|divorcio|hogar|novi/i.test(lower);
    if (isFamily) {
      await this.addSpiritualMemory(sessionId, "family_need", "Familia / matrimonio");
      return {
        intent: "consejeria",
        text: `La familia es el regalo más preciado que Dios nos dio, ${greeting}, pero también donde mayores batallas se libran.

La Palabra nos aconseja en *Colosenses 3:13*:
> *"Soportándoos con paciencia los unos a los otros, y perdonándoos unos a otros si alguno tuviere queja contra otro. De la manera que Cristo os perdonó, así también hacedlo vosotros."*

Las dificultades en el hogar no se vencen con discusiones duras, sino doblando rodillas, teniendo paciencia y sembrando amor. ¿Qué es lo más difícil que estás viviendo en tu familia en este momento?

*En oración por tu hogar,  
**${ADVISOR_NAME}*** 🌿`,
      };
    }

    // J. Respuesta libre inteligente (nunca repetir el menú inicial en medio de una charla)
    return {
      intent: "consejeria",
      text: `Te entiendo perfectamente, ${greeting}. 

Sobre esto que me comentas: *" ${rawTrimmed} "*

A veces la vida nos pone en encrucijadas o momentos donde necesitamos claridad y paz mental. Proverbios 3:5-6 nos recuerda:
> *"Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas."*

Cuéntame un poco más a fondo: ¿qué es lo que más te inquieta de esta situación o cómo sientes que puedo ayudarte a encontrar paz y dirección en esto hoy?

*Siempre contigo,  
**${ADVISOR_NAME}*** ✨`,
    };
  }
}
