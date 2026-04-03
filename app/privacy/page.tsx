export const metadata = {
  title: 'Política de Privacidad — Apex CRM',
  description: 'Política de privacidad de Apex CRM por Apoc Automation.',
};

export default function PrivacyPage() {
  return (
    <div style={{
      background: '#0a0a0a',
      minHeight: '100vh',
      color: '#f0f0f0',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1c1c1c',
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        background: '#0a0a0a',
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#c8f135',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#0a0a0a', fontWeight: 800, fontSize: 14 }}>A</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>Apex CRM</span>
          <span style={{ color: '#555', marginLeft: 'auto', fontSize: 13 }}>by Apoc Automation</span>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '64px 32px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: 'inline-block',
            background: '#c8f13520',
            border: '1px solid #c8f13540',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            color: '#c8f135',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Legal
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12, lineHeight: 1.1 }}>
            Política de Privacidad
          </h1>
          <p style={{ color: '#555', fontSize: 14 }}>
            Última actualización: 3 de abril de 2026
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <Section title="1. Introducción">
            <p>Apoc Automation (&quot;nosotros&quot;, &quot;nuestro&quot;) opera Apex CRM como un servicio de software CRM. Esta política explica cómo recopilamos, usamos y protegemos la información de las organizaciones y usuarios que utilizan nuestra plataforma.</p>
            <p>Al usar Apex CRM, aceptás esta Política de Privacidad. Si no estás de acuerdo, por favor dejá de usar el servicio.</p>
          </Section>

          <Section title="2. Información que recopilamos">
            <p>Recopilamos los siguientes tipos de información:</p>
            <ul>
              <li><strong>Datos de cuenta:</strong> nombre, dirección de correo electrónico y contraseña cifrada al registrarte.</li>
              <li><strong>Datos de la organización:</strong> nombre de la empresa, logo, configuración de módulos activos y preferencias de marca.</li>
              <li><strong>Datos de contactos y conversaciones:</strong> información de clientes, mensajes entrantes y salientes a través de WhatsApp, Messenger e Instagram que tu organización gestiona en la plataforma.</li>
              <li><strong>Datos de uso:</strong> métricas internas de actividad para mejorar el servicio (no vendemos estos datos).</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador y logs de acceso para seguridad y diagnóstico.</li>
            </ul>
          </Section>

          <Section title="3. Cómo usamos tu información">
            <p>Usamos la información para:</p>
            <ul>
              <li>Proveer y mantener el servicio Apex CRM</li>
              <li>Autenticar usuarios y gestionar sesiones</li>
              <li>Enviar notificaciones relacionadas con el servicio</li>
              <li>Detectar y prevenir actividad fraudulenta o no autorizada</li>
              <li>Mejorar la funcionalidad de la plataforma</li>
              <li>Cumplir con obligaciones legales aplicables</li>
            </ul>
            <p>No vendemos, alquilamos ni compartimos tu información personal con terceros con fines comerciales.</p>
          </Section>

          <Section title="4. Almacenamiento y seguridad">
            <p>Toda la información se almacena en servidores de <strong>Supabase</strong> ubicados en la región de São Paulo, Brasil, con encriptación en tránsito (TLS) y en reposo. Implementamos Row Level Security (RLS) para garantizar que cada organización acceda únicamente a sus propios datos.</p>
            <p>Si bien tomamos medidas de seguridad razonables, ningún sistema es 100% invulnerable. En caso de una brecha de seguridad que afecte tus datos, te notificaremos dentro de los 72 horas hábiles.</p>
          </Section>

          <Section title="5. Integraciones de terceros">
            <p>Apex CRM puede integrarse con los siguientes servicios de terceros, cada uno con sus propias políticas de privacidad:</p>
            <ul>
              <li><strong>Meta (Facebook / Instagram / WhatsApp):</strong> mensajes de plataformas sociales</li>
              <li><strong>Google:</strong> Calendar y Sheets para funcionalidades de calendario y métricas</li>
              <li><strong>Evolution API:</strong> envío y recepción de mensajes de WhatsApp Business</li>
            </ul>
            <p>Solo accedemos a los datos estrictamente necesarios para prestar el servicio.</p>
          </Section>

          <Section title="6. Retención de datos">
            <p>Conservamos tus datos mientras tu cuenta esté activa. Si cancelas el servicio, tus datos serán eliminados dentro de los 30 días hábiles, salvo que la ley exija su conservación por un período mayor.</p>
          </Section>

          <Section title="7. Tus derechos">
            <p>Tenés derecho a:</p>
            <ul>
              <li>Acceder a tus datos personales almacenados</li>
              <li>Solicitar la corrección de datos inexactos</li>
              <li>Solicitar la eliminación de tus datos</li>
              <li>Exportar tus datos en formato legible</li>
              <li>Oponerte al tratamiento de tus datos en casos específicos</li>
            </ul>
            <p>Para ejercer estos derechos, contactanos en <strong>contacto@fluxia.site</strong>.</p>
          </Section>

          <Section title="8. Cookies">
            <p>Apex CRM utiliza cookies de sesión esenciales para mantener la autenticación. No utilizamos cookies de rastreo publicitario ni compartimos información de navegación con redes publicitarias.</p>
          </Section>

          <Section title="9. Cambios a esta política">
            <p>Podemos actualizar esta política periódicamente. Te notificaremos por email o dentro de la plataforma ante cambios significativos. El uso continuado del servicio tras la notificación implica aceptación de los cambios.</p>
          </Section>

          <Section title="10. Contacto">
            <p>Para consultas sobre esta política o el manejo de tus datos:</p>
            <p>
              <strong>Apoc Automation</strong><br />
              Córdoba, Argentina<br />
              Email: <a href="mailto:contacto@fluxia.site" style={{ color: '#c8f135' }}>contacto@fluxia.site</a>
            </p>
          </Section>
        </div>

        <div style={{
          marginTop: 64,
          paddingTop: 32,
          borderTop: '1px solid #1c1c1c',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <span style={{ color: '#555', fontSize: 13 }}>© 2026 Apoc Automation. Todos los derechos reservados.</span>
          <a href="/terms" style={{ color: '#c8f135', fontSize: 13, textDecoration: 'none' }}>
            Términos y Condiciones →
          </a>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{
        fontSize: 18,
        fontWeight: 700,
        color: '#f0f0f0',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #1c1c1c',
        letterSpacing: '-0.3px',
      }}>
        {title}
      </h2>
      <div style={{
        color: '#999',
        fontSize: 15,
        lineHeight: 1.8,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {children}
      </div>
    </section>
  );
}