import { SvgIcon, SvgIconProps } from "@mui/material";
import { forwardRef } from "react";

interface FuseSvgIconProps extends SvgIconProps {
  children?: React.ReactNode;
}

const FuseSvgIcon = forwardRef<SVGSVGElement, FuseSvgIconProps>(
  (props, ref) => {
    const { children, ...other } = props;

    return (
      <SvgIcon ref={ref} {...other}>
        {children}
      </SvgIcon>
    );
  },
);

FuseSvgIcon.displayName = "FuseSvgIcon";

export default FuseSvgIcon;
