export interface IconProps{
    className: string;
    /** See https://material.io/resources/icons/?style=baseline */
    children: string
}

export function Icon(props: IconProps) {
    return (
        <i
            { ...props }
            className={ DefaultIconClassName + " " + (props.className || "") }>
            { props.children }
        </i>
    )
}

export const DefaultIconClassName = "material-icons material-symbols-outlined"

export default Icon