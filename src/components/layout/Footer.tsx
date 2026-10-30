import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/layout'
import { Github, Twitter } from 'lucide-react'

// ============================================================
// FOOTER ANTERIOR — CONSERVADO PARA USO FUTURO
// ============================================================

function LegacyFooter({ variant = "landing" }: { variant?: "landing" | "app" }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-border bg-muted overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4">
          <span className="text-[12rem] sm:text-[16rem] md:text-[20rem] lg:text-[24rem] font-bold text-foreground/5 select-none font-heading">
            CINEMATCH
          </span>
        </div>
      </div>

      <Container className="relative z-10">
        <div className="py-12 md:py-16 lg:py-20">
          {/* CTA Section - solo en landing */}
          {variant === "landing" && (
            <div className="text-center space-y-6 mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading">
                ¿Listo para Descubrir tu Próxima{' '}
                <span className="text-primary">Película Favorita</span>?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="rounded-xl">
                  <Link href="/login">Empezar Ahora</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl">
                  <Link href="/app/library">Ver Demo</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Brand Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold font-heading">Cinematch</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Descubre películas que realmente conectan con tu gusto cinematográfico.
                </p>
              </div>

              {/* Social Icons */}
              <div className="flex gap-4">
                <a
                  href="https://twitter.com/cinematch"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg p-1"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://github.com/cinematch"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg p-1"
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <nav aria-label="Producto">
              <h3 className="text-lg font-semibold mb-4">Producto</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/app/analysis"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Análisis
                  </Link>
                </li>
                <li>
                  <Link
                    href="/app/recommendations"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Recomendaciones
                  </Link>
                </li>
                <li>
                  <Link
                    href="/app/library"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Biblioteca
                  </Link>
                </li>
                <li>
                  <Link
                    href="/app/analysis"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Rankings
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Features Links */}
            <nav aria-label="Características">
              <h3 className="text-lg font-semibold mb-4">Características</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/app/upload"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Importar Películas
                  </Link>
                </li>
                <li>
                  <Link
                    href="/app/rate-movies"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Calificar Películas
                  </Link>
                </li>
                <li>
                  <Link
                    href="/app/insights"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Insights
                  </Link>
                </li>
                <li>
                  <Link
                    href="/app/community"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Comunidad
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Company Links */}
            <nav aria-label="Compañía">
              <h3 className="text-lg font-semibold mb-4">Compañía</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Acerca de
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-muted-foreground">
                    Contacto: cinematchvercel@gmail.com
                  </span>
                </li>
                <li>
                  <Link
                    href="/careers"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg inline-block"
                  >
                    Carreras
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border/20">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Legal Links */}
              <nav aria-label="Legal" className="flex gap-6">
                <Link
                  href="/terms"
                  className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg"
                >
                  Términos de Servicio
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-lg"
                >
                  Política de Privacidad
                </Link>
              </nav>

              {/* Copyright */}
              <p className="text-xs sm:text-sm text-muted-foreground">
                © {currentYear} Cinematch. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}


// ============================================================
// FOOTER ACTUAL — SOLO CONTACTO
// ============================================================

export function Footer({ variant: _variant = "landing" }: { variant?: "landing" | "app" }) {
  return (
    <footer className="relative border-t border-border bg-muted">
      <div className="flex justify-center py-8">
        <span className="text-sm text-muted-foreground">
          Contacto: cinematchvercel@gmail.com
        </span>
      </div>
    </footer>
  )
}
