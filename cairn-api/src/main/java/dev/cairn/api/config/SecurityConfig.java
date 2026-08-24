package dev.cairn.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Permits every request; the permission model itself (security doc, section 3) is
 * enforced per-controller via {@code PermissionResolver.authorize}, not this filter
 * chain (see M6's {@code DECISIONS.md} entry on why: the permission logic stays
 * front and center rather than folded into Spring Security's annotation machinery).
 *
 * <p>The CORS configuration is a real, load-bearing fix, not boilerplate: without
 * it, every browser-originated fetch from {@code web/} (not just the gap-closure
 * round's new access-management UI, but the pre-existing {@code MergeBox},
 * {@code ReviewComposer}, and {@code CommentComposer} client islands from M8) is
 * silently blocked by the browser's CORS preflight check. This was never caught
 * before because M8's own verification drove every endpoint with {@code curl},
 * which does not enforce or even perform a CORS preflight the way a real browser
 * does; only exercising the UI in an actual browser (gap-closure audit) surfaced it.
 *
 * <p>{@code cairn.web-origin} takes a comma-separated list, because a deployed
 * instance and a developer's {@code localhost:3000} are both legitimate callers at
 * the same time and a single-valued setting forces an either/or. A browser sends
 * {@code Origin} on a cross-origin request <em>and</em> on a same-origin non-GET,
 * so this list must contain the web app's public origin even though every browser
 * call is proxied same-origin through {@code web/proxy.ts}: Spring answers an
 * unlisted origin with a flat {@code 403 Invalid CORS request}, which reaches the
 * user as a failed sign-in with no hint about why.
 */
@Configuration
public class SecurityConfig {

    @Value("${cairn.web-origin:http://localhost:3000}")
    private String webOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    /**
     * Splits {@code cairn.web-origin} on commas, trimming each entry and dropping
     * blanks so a trailing comma or a stray space in a deployment variable cannot
     * register an origin that matches nothing.
     */
    private List<String> allowedOrigins() {
        return Arrays.stream(webOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }
}
