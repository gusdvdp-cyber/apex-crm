export const metadata = {
  title: 'Términos y Condiciones — Apex CRM',
  description: 'Términos y condiciones de uso de Apex CRM por Apoc Automation.',
};

export default function TermsPage() {
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
            Términos y Condiciones
          </h1>
          <p style={{ color: '#555', fontSize: 14 }}>
            Última actualización: 3 de abril de 2026
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <Section title="1. Aceptación de los términos">
            <p>Al acceder o usar Apex CRM (&quot;el Servicio&quot;), operado por Apoc Automation (&quot;nosotros&quot;), aceptás estar legalmente vinculado por estos Términos y Condiciones. Si usás el Servicio en nombre de una organización, declarás tener autoridad para vincular a dicha organización.</p>
            <p>Si no estás de acuerdo con alguno de estos términos, no uses el Servicio.</p>
          </Section>

          <Section title="2. Descripción del servicio">
            <p>Apex CRM es una plataforma de gestión de relaciones con clientes (CRM) de tipo SaaS que incluye, entre otras funcionalidades:</p>
            <ul>
              <li>Inbox omnicanal (WhatsApp, Messenger, Instagram)</li>
              <li>Pipeline de ventas estilo Kanban</li>
              <li>Gestión de contactos y conversaciones</li>
              <li>Calendario y agenda</li>
              <li>Facturación y presupuestos</li>
              <li>Gestión de empleados, nómina y stock</li>
              <li>Métricas e informes</li>
            </ul>
            <p>Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte del Servicio con previo aviso razonable.</p>
          </Section>

          <Section title="3. Registro y cuentas">
            <p>Para usar Apex CRM debés registrar una cuenta con información verídica y actualizada. Sos responsable de mantener la confidencialidad de tus credenciales y de toda actividad que ocurra bajo tu cuenta.</p>
            <p>Debés notificarnos inmediatamente ante cualquier uso no autorizado de tu cuenta a través de <strong>contacto@fluxia.site</strong>. No nos responsabilizamos por pérdidas derivadas del uso no autorizado de tu cuenta.</p>
          </Section>

          <Section title="4. Uso aceptable">
            <p>Al usar el Servicio, te comprometés a no:</p>
            <ul>
              <li>Usar el Servicio para actividades ilegales, fraudulentas o no autorizadas</li>
              <li>Transmitir spam, mensajes masivos no solicitados o contenido malicioso</li>
              <li>Intentar acceder a datos de otras organizaciones o usuarios</li>
              <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente</li>
              <li>Interferir con la seguridad o disponibilidad del Servicio</li>
              <li>Revender o sublicenciar el acceso al Servicio sin autorización escrita</li>
              <li>Violar las políticas de uso de Meta, Google u otros terceros integrados</li>
            </ul>
            <p>Podemos suspender o cancelar tu acceso ante cualquier violación de estas condiciones.</p>
          </Section>

          <Section title="5. Propiedad intelectual">
            <p>Todo el código, diseño, marca, logotipos e interfaces de Apex CRM son propiedad exclusiva de Apoc Automation y están protegidos por las leyes de propiedad intelectual aplicables.</p>
            <p>El Servicio te otorga una licencia limitada, no exclusiva, intransferible y revocable para usar Apex CRM según estos Términos. No adquirís ningún derecho de propiedad sobre el Servicio.</p>
            <p>Los datos que ingresás en la plataforma (contactos, mensajes, documentos) son y permanecen de tu propiedad. Nos otorgás una licencia limitada para procesarlos únicamente con el fin de prestarte el Servicio.</p>
          </Section>

          <Section title="6. Planes y pagos">
            <p>El acceso a Apex CRM puede requerir el pago de una tarifa de implementación y/o mantenimiento acordada contractualmente con Apoc Automation. Los detalles específicos de precios se establecen en la propuesta comercial correspondiente a cada organización.</p>
            <p>El incumplimiento de los pagos puede resultar en la suspensión del acceso al Servicio hasta la regularización.</p>
          </Section>

          <Section title="7. Limitación de responsabilidad">
            <p>En la máxima medida permitida por la ley, Apoc Automation no será responsable por:</p>
            <ul>
              <li>Pérdidas de datos o interrupciones del servicio fuera de nuestro control directo</li>
              <li>Daños indirectos, incidentales, especiales o consecuentes</li>
              <li>Pérdidas de ganancias o negocios derivadas del uso o imposibilidad de uso del Servicio</li>
              <li>Cambios en las políticas o APIs de terceros (Meta, Google, etc.) que afecten la funcionalidad</li>
            </ul>
            <p>Nuestra responsabilidad total ante cualquier reclamo no excederá el importe pagado por el Servicio en los 3 meses anteriores al hecho generador.</p>
          </Section>

          <Section title="8. Disponibilidad del servicio">
            <p>Nos esforzamos por mantener Apex CRM disponible de forma continua, pero no garantizamos disponibilidad ininterrumpida. Pueden ocurrir períodos de mantenimiento o interrupciones por causas técnicas.</p>
            <p>No nos responsabilizamos por pérdidas derivadas de interrupciones del servicio debidas a fuerza mayor, fallas de proveedores de infraestructura o ataques externos.</p>
          </Section>

          <Section title="9. Privacidad">
            <p>El tratamiento de tus datos personales está regulado por nuestra <a href="/privacy" style={{ color: '#c8f135' }}>Política de Privacidad</a>, que forma parte integral de estos Términos. Al usar el Servicio, aceptás dicha política.</p>
          </Section>

          <Section title="10. Terminación">
            <p>Podés cancelar tu cuenta en cualquier momento contactándonos. Nos reservamos el derecho de suspender o cancelar cuentas que violen estos Términos, con o sin aviso previo dependiendo de la gravedad de la infracción.</p>
            <p>Ante la terminación, tus datos serán eliminados según lo establecido en la Política de Privacidad.</p>
          </Section>

          <Section title="11. Modificaciones">
            <p>Podemos actualizar estos Términos en cualquier momento. Los cambios materiales serán comunicados por email o mediante aviso dentro de la plataforma con al menos 15 días de anticipación. El uso continuado del Servicio tras ese período implica la aceptación de los nuevos términos.</p>
          </Section>

          <Section title="12. Ley aplicable">
            <p>Estos Términos se rigen por las leyes de la República Argentina. Cualquier disputa será sometida a la jurisdicción de los tribunales ordinarios de la Ciudad de Córdoba, Argentina, renunciando las partes a cualquier otro fuero que pudiera corresponderles.</p>
          </Section>

          <Section title="13. Contacto">
            <p>Para consultas sobre estos Términos:</p>
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
          <a href="/privacy" style={{ color: '#c8f135', fontSize: 13, textDecoration: 'none' }}>
            ← Política de Privacidad
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