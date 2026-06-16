import { Typography, type TypographyProps } from "@mui/material";

/** Fraunces italic display heading for hero/section titles. */
export default function DisplayHeading({ sx, ...rest }: TypographyProps) {
  return (
    <Typography
      {...rest}
      sx={{
        fontFamily: "var(--font-fraunces), Georgia, serif",
        fontStyle: "italic",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        ...sx,
      }}
    />
  );
}
