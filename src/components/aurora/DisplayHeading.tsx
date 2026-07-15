import { Typography, type TypographyProps } from "@mui/material";

/** Bold, tight sans display heading for hero/section titles (NIM style). */
export default function DisplayHeading({ sx, ...rest }: TypographyProps) {
  return (
    <Typography
      {...rest}
      sx={{
        fontWeight: 700,
        letterSpacing: "-0.02em",
        ...sx,
      }}
    />
  );
}
